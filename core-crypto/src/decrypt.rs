use wasm_bindgen::prelude::*;
use argon2::{
    Argon2, Algorithm, Version, Params,
};
use deoxys::DeoxysII256;
use aead::{AeadInPlace, KeyInit};
use zeroize::Zeroizing;

use crate::constants::*;

#[wasm_bindgen]
pub struct Decryptor {
    cipher: DeoxysII256,
    nonce_base: [u8; NONCE_LEN],
    chunk_counter: u32,
}

#[wasm_bindgen]
impl Decryptor {
    #[wasm_bindgen(constructor)]
    pub fn new(password: &str, header: &[u8]) -> Result<Decryptor, String> {
        if header.len() != HEADER_LEN {
            return Err("Invalid header length".to_string());
        }

        let magic = &header[0..MAGIC_LEN];
        if magic != MAGIC_NUMBER {
            return Err("Invalid magic number (not a .hat file)".to_string());
        }

        let salt = &header[MAGIC_LEN..MAGIC_LEN + SALT_LEN];
        
        let mut nonce_base = [0u8; NONCE_LEN];
        nonce_base.copy_from_slice(&header[MAGIC_LEN + SALT_LEN..MAGIC_LEN + SALT_LEN + NONCE_LEN]);

        let params_offset = MAGIC_LEN + SALT_LEN + NONCE_LEN;
        
        let m_cost = u32::from_be_bytes(header[params_offset..params_offset+4].try_into().unwrap());
        let t_cost = u32::from_be_bytes(header[params_offset+4..params_offset+8].try_into().unwrap());
        let p_cost = u32::from_be_bytes(header[params_offset+8..params_offset+12].try_into().unwrap());

        let params = Params::new(m_cost, t_cost, p_cost, None)
            .map_err(|_| "Invalid Argon2 parameters in header".to_string())?;

        let mut key = Zeroizing::new([0u8; 32]);
        let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
        argon2.hash_password_into(password.as_bytes(), salt, key.as_mut())
            .map_err(|_| "Key derivation failed".to_string())?;

        let cipher = DeoxysII256::new(key.as_ref().into());

        Ok(Decryptor {
            cipher,
            nonce_base,
            chunk_counter: 0,
        })
    }

    pub fn decrypt_chunk(&mut self, chunk: &[u8]) -> Result<Vec<u8>, String> {
        let mut nonce = self.nonce_base;
        let counter_bytes = self.chunk_counter.to_be_bytes();
        for i in 0..4 {
            nonce[NONCE_LEN - 4 + i] ^= counter_bytes[i];
        }

        let mut buffer = Zeroizing::new(chunk.to_vec());
        self.cipher.decrypt_in_place(&nonce.into(), b"", &mut *buffer)
            .map_err(|_| "Decryption failed. Incorrect password or corrupted file.".to_string())?;

        self.chunk_counter += 1;
        Ok(buffer.to_vec())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::encrypt::Encryptor;

    #[test]
    fn test_encryption_decryption() {
        let password = "super_secure_password";
        let message1 = b"Hello world 1";
        let message2 = b"Hello world 2";

        let mut encryptor = Encryptor::new(password).unwrap();
        let header = encryptor.get_header();

        let c1 = encryptor.encrypt_chunk(message1).unwrap();
        let c2 = encryptor.encrypt_chunk(message2).unwrap();

        let mut decryptor = Decryptor::new(password, &header).unwrap();
        let p1 = decryptor.decrypt_chunk(&c1).unwrap();
        let p2 = decryptor.decrypt_chunk(&c2).unwrap();

        assert_eq!(p1, message1);
        assert_eq!(p2, message2);
    }

    #[test]
    fn test_invalid_password() {
        let password = "super_secure_password";
        let mut encryptor = Encryptor::new(password).unwrap();
        let header = encryptor.get_header();
        let c1 = encryptor.encrypt_chunk(b"secret").unwrap();

        let mut decryptor = Decryptor::new("wrong_password", &header).unwrap();
        assert!(decryptor.decrypt_chunk(&c1).is_err());
    }

    #[test]
    fn test_invalid_header_length() {
        let header = vec![0u8; HEADER_LEN - 1];
        assert!(Decryptor::new("password", &header).is_err());
        let header = vec![0u8; HEADER_LEN + 1];
        assert!(Decryptor::new("password", &header).is_err());
    }

    #[test]
    fn test_invalid_magic() {
        let mut header = vec![0u8; HEADER_LEN];
        // The first 62 bytes are the magic number, keep them 0 which is incorrect
        assert!(Decryptor::new("password", &header).is_err());
    }

    #[test]
    fn test_invalid_argon_params() {
        let mut encryptor = Encryptor::new("test_password").unwrap();
        let mut header = encryptor.get_header();
        
        let params_offset = MAGIC_LEN + SALT_LEN + NONCE_LEN;
        // set p_cost to 0, which makes Params::new fail
        header[params_offset+8..params_offset+12].copy_from_slice(&0u32.to_be_bytes());
        assert!(Decryptor::new("test_password", &header).is_err());
    }

    #[test]
    fn test_corrupted_ciphertext() {
        let password = "super_secure_password";
        let mut encryptor = Encryptor::new(password).unwrap();
        let header = encryptor.get_header();

        let mut c1 = encryptor.encrypt_chunk(b"secret").unwrap();
        // Flip a bit in ciphertext
        c1[0] ^= 1;

        let mut decryptor = Decryptor::new(password, &header).unwrap();
        assert!(decryptor.decrypt_chunk(&c1).is_err());
    }
}
