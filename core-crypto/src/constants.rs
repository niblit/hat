pub const MAGIC_NUMBER: &[u8] = b".hat file encryption, made with <3 by niblit at hat.niblit.dev";
pub const MAGIC_LEN: usize = 62;
pub const SALT_LEN: usize = 16;
pub const NONCE_LEN: usize = 15;
pub const PARAMS_LEN: usize = 12; // memory_kib (4) + iterations (4) + parallelism (4)
pub const HEADER_LEN: usize = MAGIC_LEN + SALT_LEN + NONCE_LEN + PARAMS_LEN; // 105 bytes
pub const CHUNK_SIZE: usize = 10 * 1024 * 1024; // 10 MiB
