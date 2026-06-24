use wasm_bindgen::prelude::*;
use argon2::{
    password_hash::rand_core::{OsRng, RngCore},
    Argon2, Algorithm, Version, Params,
};
use deoxys::DeoxysII256;
use aead::{AeadInPlace, KeyInit};
use zeroize::Zeroizing;

use crate::constants::*;

#[wasm_bindgen]
pub struct Encryptor {
    cipher: DeoxysII256,
    nonce_base: [u8; NONCE_LEN],
    chunk_counter: u32,
    header: Vec<u8>,
}

#[wasm_bindgen]
impl Encryptor {
    #[wasm_bindgen(constructor)]
    pub fn new(password: &str) -> Result<Encryptor, String> {
        let mut salt = [0u8; SALT_LEN];
        OsRng.fill_bytes(&mut salt);

        let mut nonce_base = [0u8; NONCE_LEN];
        OsRng.fill_bytes(&mut nonce_base);

        let mut key = Zeroizing::new([0u8; 32]);
        let params = Params::new(65536, 4, 1, None)
            .map_err(|_| "Invalid Argon2 params".to_string())?;
        
        let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params.clone());
        argon2.hash_password_into(password.as_bytes(), &salt, key.as_mut())
            .map_err(|_| "Key derivation failed".to_string())?;

        let cipher = DeoxysII256::new(key.as_ref().into());

        let mut header = Vec::with_capacity(HEADER_LEN);
        header.extend_from_slice(MAGIC_NUMBER);
        header.extend_from_slice(&salt);
        header.extend_from_slice(&nonce_base);
        header.extend_from_slice(&params.m_cost().to_be_bytes());
        header.extend_from_slice(&params.t_cost().to_be_bytes());
        header.extend_from_slice(&params.p_cost().to_be_bytes());

        Ok(Encryptor {
            cipher,
            nonce_base,
            chunk_counter: 0,
            header,
        })
    }

    pub fn get_header(&self) -> Vec<u8> {
        self.header.clone()
    }

    pub fn encrypt_chunk(&mut self, chunk: &[u8]) -> Result<Vec<u8>, String> {
        let mut nonce = self.nonce_base;
        let counter_bytes = self.chunk_counter.to_be_bytes();
        for i in 0..4 {
            nonce[NONCE_LEN - 4 + i] ^= counter_bytes[i];
        }

        let mut buffer = Zeroizing::new(chunk.to_vec());
        self.cipher.encrypt_in_place(&nonce.into(), b"", &mut *buffer)
            .map_err(|_| "Encryption failed".to_string())?;

        self.chunk_counter += 1;
        Ok(buffer.to_vec())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encryptor_initialization() {
        let encryptor = Encryptor::new("test_password").unwrap();
        let header = encryptor.get_header();
        assert_eq!(header.len(), HEADER_LEN);
        assert_eq!(&header[0..MAGIC_LEN], MAGIC_NUMBER);
    }

    #[test]
    fn test_encrypt_chunk_increments_counter() {
        let mut encryptor = Encryptor::new("test_password").unwrap();
        assert_eq!(encryptor.chunk_counter, 0);
        let _ = encryptor.encrypt_chunk(b"test data").unwrap();
        assert_eq!(encryptor.chunk_counter, 1);
    }
    
    #[test]
    fn test_encrypt_output_length() {
        let mut encryptor = Encryptor::new("test_password").unwrap();
        let data = b"some strictly 16 byte data yes";
        let encrypted = encryptor.encrypt_chunk(data).unwrap();
        // Deoxys II adds 16 bytes auth tag
        assert_eq!(encrypted.len(), data.len() + 16);
    }
}
