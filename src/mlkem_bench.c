#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <openssl/evp.h>
#include <openssl/err.h>
#include <openssl/core_names.h>

#define TEST_DURATION_SEC 5

static void handle_errors(const char *msg) {
    fprintf(stderr, "Error: %s\n", msg);
    ERR_print_errors_fp(stderr);
    exit(1);
}

static double get_time_sec() {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec + ts.tv_nsec / 1e9;
}

int main(int argc, char *argv[]) {
    EVP_PKEY_CTX *ctx = NULL;
    EVP_PKEY *keypair = NULL;
    unsigned char *ciphertext = NULL;
    unsigned char *shared_secret_enc = NULL;
    unsigned char *shared_secret_dec = NULL;
    size_t ct_len = 0, ss_enc_len = 0, ss_dec_len = 0;
    int iterations = 0;
    double start_time, elapsed;
    
    // Initialize OpenSSL
    OpenSSL_add_all_algorithms();
    ERR_load_crypto_strings();
    
    // Generate ML-KEM-768 keypair
    ctx = EVP_PKEY_CTX_new_from_name(NULL, "ML-KEM-768", NULL);
    if (!ctx) {
        handle_errors("Failed to create ML-KEM-768 context");
    }
    
    if (EVP_PKEY_keygen_init(ctx) <= 0) {
        handle_errors("Failed to initialize keygen");
    }
    
    if (EVP_PKEY_generate(ctx, &keypair) <= 0) {
        handle_errors("Failed to generate ML-KEM-768 keypair");
    }
    
    EVP_PKEY_CTX_free(ctx);
    
    // Allocate buffers for encapsulation
    ct_len = 1088;  // ML-KEM-768 ciphertext size
    ss_enc_len = 32; // Shared secret size
    ss_dec_len = 32;
    
    ciphertext = malloc(ct_len);
    shared_secret_enc = malloc(ss_enc_len);
    shared_secret_dec = malloc(ss_dec_len);
    
    if (!ciphertext || !shared_secret_enc || !shared_secret_dec) {
        handle_errors("Failed to allocate buffers");
    }
    
    // Benchmark encapsulation (key generation on receiver side)
    iterations = 0;
    start_time = get_time_sec();
    
    while ((elapsed = get_time_sec() - start_time) < TEST_DURATION_SEC) {
        ctx = EVP_PKEY_CTX_new(keypair, NULL);
        if (!ctx) {
            handle_errors("Failed to create encap context");
        }
        
        if (EVP_PKEY_encapsulate_init(ctx, NULL) <= 0) {
            handle_errors("Failed to initialize encapsulation");
        }
        
        size_t ct_len_tmp = ct_len;
        size_t ss_enc_len_tmp = ss_enc_len;
        
        if (EVP_PKEY_encapsulate(ctx, ciphertext, &ct_len_tmp, 
                                  shared_secret_enc, &ss_enc_len_tmp) <= 0) {
            handle_errors("Failed to encapsulate");
        }
        
        EVP_PKEY_CTX_free(ctx);
        iterations++;
    }
    
    double ops_per_sec = iterations / elapsed;
    
    // Output result
    printf("ml-kem-768 encapsulate: %.1f ops/sec\n", ops_per_sec);
    
    // Benchmark decapsulation
    iterations = 0;
    start_time = get_time_sec();
    
    // Do one encapsulation to get valid ciphertext
    ctx = EVP_PKEY_CTX_new(keypair, NULL);
    EVP_PKEY_encapsulate_init(ctx, NULL);
    size_t ct_len_tmp = ct_len;
    size_t ss_enc_len_tmp = ss_enc_len;
    EVP_PKEY_encapsulate(ctx, ciphertext, &ct_len_tmp, shared_secret_enc, &ss_enc_len_tmp);
    EVP_PKEY_CTX_free(ctx);
    
    while ((elapsed = get_time_sec() - start_time) < TEST_DURATION_SEC) {
        ctx = EVP_PKEY_CTX_new(keypair, NULL);
        if (!ctx) {
            handle_errors("Failed to create decap context");
        }
        
        if (EVP_PKEY_decapsulate_init(ctx, NULL) <= 0) {
            handle_errors("Failed to initialize decapsulation");
        }
        
        size_t ss_dec_len_tmp = ss_dec_len;
        
        if (EVP_PKEY_decapsulate(ctx, shared_secret_dec, &ss_dec_len_tmp,
                                  ciphertext, ct_len_tmp) <= 0) {
            handle_errors("Failed to decapsulate");
        }
        
        EVP_PKEY_CTX_free(ctx);
        iterations++;
    }
    
    ops_per_sec = iterations / elapsed;
    printf("ml-kem-768 decapsulate: %.1f ops/sec\n", ops_per_sec);
    
    // Average of both operations
    double avg_ops = (iterations / elapsed);
    printf("ml-kem-768 average: %.1f ops/sec\n", avg_ops);
    
    // Cleanup
    EVP_PKEY_free(keypair);
    free(ciphertext);
    free(shared_secret_enc);
    free(shared_secret_dec);
    
    return 0;
}

