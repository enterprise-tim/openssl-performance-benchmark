/*
 * ML-DSA (Dilithium) Benchmark with Rejection Sampling Analysis
 * 
 * This benchmark is designed to surface the retry/rejection sampling behavior
 * inherent in the Dilithium signature algorithm. Unlike traditional signature
 * schemes, Dilithium's signing process may need to retry multiple times when
 * certain mathematical conditions aren't met - this is a security feature that
 * prevents side-channel attacks.
 * 
 * Key metrics captured:
 * - Average ops/sec (overall throughput)
 * - Min/Max timing (reveals retry outliers)  
 * - Standard deviation (high stddev = retry variance)
 * - Timing histogram (distribution analysis)
 * - Outlier count (operations taking >2x average)
 * 
 * Reference: Schmatz's concerns about Dilithium retry behavior under stress
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include <openssl/evp.h>
#include <openssl/err.h>
#include <openssl/rand.h>
#include <openssl/core_names.h>

/* Test configuration */
/* Duration increased to 90s for P99.9/P99.99 statistical significance */
/* At ~1200 ops/sec, this yields ~108,000 samples for robust tail percentiles */
#define TEST_DURATION_SEC 90
#define MAX_SAMPLES 120000
#define HISTOGRAM_BUCKETS 20
#define OUTLIER_THRESHOLD 2.0  /* Times > 2x mean are considered outliers */
#define MESSAGE_SIZE 256       /* Size of message to sign */

/* Timing sample storage */
typedef struct {
    double *samples;
    size_t count;
    size_t capacity;
    double min;
    double max;
    double sum;
} TimingSamples;

static void handle_errors(const char *msg) {
    fprintf(stderr, "Error: %s\n", msg);
    ERR_print_errors_fp(stderr);
    exit(1);
}

static double get_time_sec(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec + ts.tv_nsec / 1e9;
}

static TimingSamples* timing_samples_new(size_t capacity) {
    TimingSamples *ts = malloc(sizeof(TimingSamples));
    if (!ts) return NULL;
    
    ts->samples = malloc(sizeof(double) * capacity);
    if (!ts->samples) {
        free(ts);
        return NULL;
    }
    
    ts->count = 0;
    ts->capacity = capacity;
    ts->min = 1e9;
    ts->max = 0;
    ts->sum = 0;
    
    return ts;
}

static void timing_samples_add(TimingSamples *ts, double sample) {
    if (ts->count < ts->capacity) {
        ts->samples[ts->count++] = sample;
        ts->sum += sample;
        if (sample < ts->min) ts->min = sample;
        if (sample > ts->max) ts->max = sample;
    }
}

static double timing_samples_mean(TimingSamples *ts) {
    if (ts->count == 0) return 0;
    return ts->sum / ts->count;
}

static double timing_samples_stddev(TimingSamples *ts) {
    if (ts->count < 2) return 0;
    
    double mean = timing_samples_mean(ts);
    double variance_sum = 0;
    
    for (size_t i = 0; i < ts->count; i++) {
        double diff = ts->samples[i] - mean;
        variance_sum += diff * diff;
    }
    
    return sqrt(variance_sum / (ts->count - 1));
}

static size_t timing_samples_outliers(TimingSamples *ts, double threshold_multiplier) {
    double mean = timing_samples_mean(ts);
    double threshold = mean * threshold_multiplier;
    size_t outliers = 0;
    
    for (size_t i = 0; i < ts->count; i++) {
        if (ts->samples[i] > threshold) {
            outliers++;
        }
    }
    
    return outliers;
}

/* Calculate percentile (0-100) */
static int compare_double(const void *a, const void *b) {
    double da = *(const double*)a;
    double db = *(const double*)b;
    return (da > db) - (da < db);
}

static double timing_samples_percentile(TimingSamples *ts, double percentile) {
    if (ts->count == 0) return 0;
    
    /* Create sorted copy */
    double *sorted = malloc(sizeof(double) * ts->count);
    memcpy(sorted, ts->samples, sizeof(double) * ts->count);
    qsort(sorted, ts->count, sizeof(double), compare_double);
    
    size_t index = (size_t)((percentile / 100.0) * (ts->count - 1));
    double result = sorted[index];
    free(sorted);
    
    return result;
}

static void timing_samples_free(TimingSamples *ts) {
    if (ts) {
        free(ts->samples);
        free(ts);
    }
}

/* Print timing histogram to stderr for visual analysis */
static void print_histogram(TimingSamples *ts, const char *label) {
    if (ts->count == 0) return;
    
    double min = ts->min;
    double max = ts->max;
    double bucket_width = (max - min) / HISTOGRAM_BUCKETS;
    
    if (bucket_width == 0) {
        fprintf(stderr, "%s: All samples identical (%.6f ms)\n", label, min * 1000);
        return;
    }
    
    size_t buckets[HISTOGRAM_BUCKETS] = {0};
    
    for (size_t i = 0; i < ts->count; i++) {
        int bucket = (int)((ts->samples[i] - min) / bucket_width);
        if (bucket >= HISTOGRAM_BUCKETS) bucket = HISTOGRAM_BUCKETS - 1;
        if (bucket < 0) bucket = 0;
        buckets[bucket]++;
    }
    
    /* Find max bucket for scaling */
    size_t max_bucket = 0;
    for (int i = 0; i < HISTOGRAM_BUCKETS; i++) {
        if (buckets[i] > max_bucket) max_bucket = buckets[i];
    }
    
    fprintf(stderr, "\n%s Timing Distribution (showing retry variance):\n", label);
    fprintf(stderr, "  Time (ms)     Count  Distribution\n");
    fprintf(stderr, "  ─────────────────────────────────────────────────────\n");
    
    for (int i = 0; i < HISTOGRAM_BUCKETS; i++) {
        double bucket_start = min + i * bucket_width;
        int bar_width = max_bucket > 0 ? (int)(30.0 * buckets[i] / max_bucket) : 0;
        
        fprintf(stderr, "  %6.3f-%6.3f %5zu  ", 
                bucket_start * 1000, 
                (bucket_start + bucket_width) * 1000,
                buckets[i]);
        
        for (int j = 0; j < bar_width; j++) {
            fprintf(stderr, "█");
        }
        fprintf(stderr, "\n");
    }
    fprintf(stderr, "\n");
}

/* Benchmark ML-DSA signing with detailed timing analysis */
static void benchmark_mldsa_sign(const char *algorithm, EVP_PKEY *keypair, 
                                  unsigned char *message, size_t msg_len,
                                  TimingSamples *timing) {
    EVP_MD_CTX *md_ctx = NULL;
    unsigned char *signature = NULL;
    size_t sig_len = 0;
    double start, elapsed;
    double overall_start = get_time_sec();
    
    /* Get signature size */
    md_ctx = EVP_MD_CTX_new();
    if (!md_ctx) handle_errors("Failed to create MD context");
    
    if (EVP_DigestSignInit(md_ctx, NULL, NULL, NULL, keypair) <= 0) {
        handle_errors("Failed to initialize digest sign");
    }
    
    if (EVP_DigestSign(md_ctx, NULL, &sig_len, message, msg_len) <= 0) {
        handle_errors("Failed to get signature size");
    }
    
    signature = malloc(sig_len);
    if (!signature) handle_errors("Failed to allocate signature buffer");
    
    EVP_MD_CTX_free(md_ctx);
    
    /* Benchmark loop - capture individual operation timings */
    while ((get_time_sec() - overall_start) < TEST_DURATION_SEC && 
           timing->count < timing->capacity) {
        md_ctx = EVP_MD_CTX_new();
        if (!md_ctx) handle_errors("Failed to create MD context in loop");
        
        if (EVP_DigestSignInit(md_ctx, NULL, NULL, NULL, keypair) <= 0) {
            EVP_MD_CTX_free(md_ctx);
            continue;
        }
        
        size_t sig_len_tmp = sig_len;
        
        /* Time this individual signing operation */
        start = get_time_sec();
        int result = EVP_DigestSign(md_ctx, signature, &sig_len_tmp, message, msg_len);
        elapsed = get_time_sec() - start;
        
        EVP_MD_CTX_free(md_ctx);
        
        if (result > 0) {
            timing_samples_add(timing, elapsed);
        }
    }
    
    free(signature);
}

/* Benchmark ML-DSA verification */
static void benchmark_mldsa_verify(const char *algorithm, EVP_PKEY *keypair,
                                    unsigned char *message, size_t msg_len,
                                    unsigned char *signature, size_t sig_len,
                                    TimingSamples *timing) {
    EVP_MD_CTX *md_ctx = NULL;
    double start, elapsed;
    double overall_start = get_time_sec();
    
    while ((get_time_sec() - overall_start) < TEST_DURATION_SEC && 
           timing->count < timing->capacity) {
        md_ctx = EVP_MD_CTX_new();
        if (!md_ctx) continue;
        
        if (EVP_DigestVerifyInit(md_ctx, NULL, NULL, NULL, keypair) <= 0) {
            EVP_MD_CTX_free(md_ctx);
            continue;
        }
        
        start = get_time_sec();
        int result = EVP_DigestVerify(md_ctx, signature, sig_len, message, msg_len);
        elapsed = get_time_sec() - start;
        
        EVP_MD_CTX_free(md_ctx);
        
        if (result == 1) {
            timing_samples_add(timing, elapsed);
        }
    }
}

static int test_algorithm(const char *algo_name) {
    EVP_PKEY_CTX *ctx = NULL;
    EVP_PKEY *keypair = NULL;
    EVP_MD_CTX *md_ctx = NULL;
    unsigned char message[MESSAGE_SIZE];
    unsigned char *signature = NULL;
    size_t sig_len = 0;
    
    fprintf(stderr, "\n========================================\n");
    fprintf(stderr, "Testing %s (Rejection Sampling Analysis)\n", algo_name);
    fprintf(stderr, "========================================\n");
    
    /* Generate random message */
    if (RAND_bytes(message, MESSAGE_SIZE) != 1) {
        fprintf(stderr, "Warning: Failed to generate random message\n");
        memset(message, 0x42, MESSAGE_SIZE);
    }
    
    /* Generate keypair */
    fprintf(stderr, "Generating %s keypair...\n", algo_name);
    ctx = EVP_PKEY_CTX_new_from_name(NULL, algo_name, NULL);
    if (!ctx) {
        fprintf(stderr, "%s not available in this OpenSSL build\n", algo_name);
        return 0;
    }
    
    if (EVP_PKEY_keygen_init(ctx) <= 0) {
        fprintf(stderr, "Failed to initialize keygen for %s\n", algo_name);
        EVP_PKEY_CTX_free(ctx);
        return 0;
    }
    
    if (EVP_PKEY_generate(ctx, &keypair) <= 0) {
        fprintf(stderr, "Failed to generate %s keypair\n", algo_name);
        EVP_PKEY_CTX_free(ctx);
        return 0;
    }
    
    EVP_PKEY_CTX_free(ctx);
    fprintf(stderr, "Keypair generated successfully\n");
    
    /* Create timing samples for signing */
    TimingSamples *sign_timing = timing_samples_new(MAX_SAMPLES);
    TimingSamples *verify_timing = timing_samples_new(MAX_SAMPLES);
    
    if (!sign_timing || !verify_timing) {
        handle_errors("Failed to allocate timing samples");
    }
    
    /* Benchmark signing */
    fprintf(stderr, "Benchmarking signing (%d seconds)...\n", TEST_DURATION_SEC);
    benchmark_mldsa_sign(algo_name, keypair, message, MESSAGE_SIZE, sign_timing);
    
    /* Generate one signature for verification benchmark */
    md_ctx = EVP_MD_CTX_new();
    EVP_DigestSignInit(md_ctx, NULL, NULL, NULL, keypair);
    EVP_DigestSign(md_ctx, NULL, &sig_len, message, MESSAGE_SIZE);
    signature = malloc(sig_len);
    EVP_DigestSign(md_ctx, signature, &sig_len, message, MESSAGE_SIZE);
    EVP_MD_CTX_free(md_ctx);
    
    /* Benchmark verification */
    fprintf(stderr, "Benchmarking verification (%d seconds)...\n", TEST_DURATION_SEC);
    benchmark_mldsa_verify(algo_name, keypair, message, MESSAGE_SIZE, 
                           signature, sig_len, verify_timing);
    
    /* Calculate and report statistics */
    double sign_mean = timing_samples_mean(sign_timing);
    double sign_stddev = timing_samples_stddev(sign_timing);
    double sign_p50 = timing_samples_percentile(sign_timing, 50);
    double sign_p95 = timing_samples_percentile(sign_timing, 95);
    double sign_p99 = timing_samples_percentile(sign_timing, 99);
    double sign_p999 = timing_samples_percentile(sign_timing, 99.9);
    double sign_p9999 = timing_samples_percentile(sign_timing, 99.99);
    size_t sign_outliers = timing_samples_outliers(sign_timing, OUTLIER_THRESHOLD);
    
    double verify_mean = timing_samples_mean(verify_timing);
    double verify_stddev = timing_samples_stddev(verify_timing);
    double verify_p50 = timing_samples_percentile(verify_timing, 50);
    double verify_p95 = timing_samples_percentile(verify_timing, 95);
    double verify_p99 = timing_samples_percentile(verify_timing, 99);
    double verify_p999 = timing_samples_percentile(verify_timing, 99.9);
    double verify_p9999 = timing_samples_percentile(verify_timing, 99.99);
    size_t verify_outliers = timing_samples_outliers(verify_timing, OUTLIER_THRESHOLD);
    
    /* Calculate coefficient of variation (CV) - higher = more retry variance */
    double sign_cv = (sign_mean > 0) ? (sign_stddev / sign_mean) * 100 : 0;
    double verify_cv = (verify_mean > 0) ? (verify_stddev / verify_mean) * 100 : 0;
    
    /* Print detailed analysis to stderr */
    fprintf(stderr, "\n%s SIGNING Analysis:\n", algo_name);
    fprintf(stderr, "  Operations:     %zu\n", sign_timing->count);
    fprintf(stderr, "  Throughput:     %.1f ops/sec\n", sign_mean > 0 ? 1.0/sign_mean : 0);
    fprintf(stderr, "  Mean time:      %.3f ms\n", sign_mean * 1000);
    fprintf(stderr, "  Std deviation:  %.3f ms (CV: %.1f%%)\n", sign_stddev * 1000, sign_cv);
    fprintf(stderr, "  Min time:       %.3f ms\n", sign_timing->min * 1000);
    fprintf(stderr, "  Max time:       %.3f ms (%.1fx mean)\n", 
            sign_timing->max * 1000, sign_mean > 0 ? sign_timing->max/sign_mean : 0);
    fprintf(stderr, "  P50 (median):   %.3f ms\n", sign_p50 * 1000);
    fprintf(stderr, "  P95:            %.3f ms\n", sign_p95 * 1000);
    fprintf(stderr, "  P99:            %.3f ms\n", sign_p99 * 1000);
    fprintf(stderr, "  P99.9:          %.3f ms\n", sign_p999 * 1000);
    fprintf(stderr, "  P99.99:         %.3f ms\n", sign_p9999 * 1000);
    fprintf(stderr, "  Outliers (>2x): %zu (%.2f%%)\n", 
            sign_outliers, sign_timing->count > 0 ? 100.0*sign_outliers/sign_timing->count : 0);
    
    /* High CV or many outliers suggests rejection sampling retries */
    if (sign_cv > 10.0 || (100.0*sign_outliers/sign_timing->count) > 5.0) {
        fprintf(stderr, "  ⚠️  HIGH VARIANCE detected - likely rejection sampling retries!\n");
    }
    
    fprintf(stderr, "\n%s VERIFICATION Analysis:\n", algo_name);
    fprintf(stderr, "  Operations:     %zu\n", verify_timing->count);
    fprintf(stderr, "  Throughput:     %.1f ops/sec\n", verify_mean > 0 ? 1.0/verify_mean : 0);
    fprintf(stderr, "  Mean time:      %.3f ms\n", verify_mean * 1000);
    fprintf(stderr, "  Std deviation:  %.3f ms (CV: %.1f%%)\n", verify_stddev * 1000, verify_cv);
    fprintf(stderr, "  Min time:       %.3f ms\n", verify_timing->min * 1000);
    fprintf(stderr, "  Max time:       %.3f ms\n", verify_timing->max * 1000);
    fprintf(stderr, "  P50 (median):   %.3f ms\n", verify_p50 * 1000);
    fprintf(stderr, "  P95:            %.3f ms\n", verify_p95 * 1000);
    fprintf(stderr, "  P99:            %.3f ms\n", verify_p99 * 1000);
    fprintf(stderr, "  P99.9:          %.3f ms\n", verify_p999 * 1000);
    fprintf(stderr, "  P99.99:         %.3f ms\n", verify_p9999 * 1000);
    
    /* Print histograms */
    print_histogram(sign_timing, "Sign");
    print_histogram(verify_timing, "Verify");
    
    /* Output JSON results to stdout */
    /* Convert algo name to metric-friendly format */
    char metric_name[64];
    strncpy(metric_name, algo_name, sizeof(metric_name) - 1);
    metric_name[sizeof(metric_name) - 1] = '\0';
    for (char *p = metric_name; *p; p++) {
        if (*p == '-') *p = '_';
        if (*p >= 'A' && *p <= 'Z') *p = *p + ('a' - 'A');
    }
    
    printf("%s sign_ops_sec: %.1f\n", metric_name, sign_mean > 0 ? 1.0/sign_mean : 0);
    printf("%s sign_mean_ms: %.4f\n", metric_name, sign_mean * 1000);
    printf("%s sign_stddev_ms: %.4f\n", metric_name, sign_stddev * 1000);
    printf("%s sign_cv_percent: %.2f\n", metric_name, sign_cv);
    printf("%s sign_min_ms: %.4f\n", metric_name, sign_timing->min * 1000);
    printf("%s sign_max_ms: %.4f\n", metric_name, sign_timing->max * 1000);
    printf("%s sign_p50_ms: %.4f\n", metric_name, sign_p50 * 1000);
    printf("%s sign_p95_ms: %.4f\n", metric_name, sign_p95 * 1000);
    printf("%s sign_p99_ms: %.4f\n", metric_name, sign_p99 * 1000);
    printf("%s sign_p999_ms: %.4f\n", metric_name, sign_p999 * 1000);
    printf("%s sign_p9999_ms: %.4f\n", metric_name, sign_p9999 * 1000);
    printf("%s sign_outlier_count: %zu\n", metric_name, sign_outliers);
    printf("%s sign_outlier_percent: %.2f\n", metric_name, 
           sign_timing->count > 0 ? 100.0*sign_outliers/sign_timing->count : 0);
    printf("%s sign_sample_count: %zu\n", metric_name, sign_timing->count);
    
    printf("%s verify_ops_sec: %.1f\n", metric_name, verify_mean > 0 ? 1.0/verify_mean : 0);
    printf("%s verify_mean_ms: %.4f\n", metric_name, verify_mean * 1000);
    printf("%s verify_stddev_ms: %.4f\n", metric_name, verify_stddev * 1000);
    printf("%s verify_cv_percent: %.2f\n", metric_name, verify_cv);
    printf("%s verify_min_ms: %.4f\n", metric_name, verify_timing->min * 1000);
    printf("%s verify_max_ms: %.4f\n", metric_name, verify_timing->max * 1000);
    printf("%s verify_p50_ms: %.4f\n", metric_name, verify_p50 * 1000);
    printf("%s verify_p95_ms: %.4f\n", metric_name, verify_p95 * 1000);
    printf("%s verify_p99_ms: %.4f\n", metric_name, verify_p99 * 1000);
    printf("%s verify_p999_ms: %.4f\n", metric_name, verify_p999 * 1000);
    printf("%s verify_p9999_ms: %.4f\n", metric_name, verify_p9999 * 1000);
    printf("%s verify_sample_count: %zu\n", metric_name, verify_timing->count);
    
    /* Cleanup */
    timing_samples_free(sign_timing);
    timing_samples_free(verify_timing);
    free(signature);
    EVP_PKEY_free(keypair);
    
    return 1;
}

int main(int argc, char *argv[]) {
    int tested = 0;
    
    /* Initialize OpenSSL */
    OpenSSL_add_all_algorithms();
    ERR_load_crypto_strings();
    
    fprintf(stderr, "ML-DSA (Dilithium) Benchmark with Rejection Sampling Analysis\n");
    fprintf(stderr, "==============================================================\n");
    fprintf(stderr, "This test measures timing variance in signature generation to\n");
    fprintf(stderr, "surface the rejection sampling retry mechanism in Dilithium.\n");
    fprintf(stderr, "\n");
    fprintf(stderr, "High coefficient of variation (CV%%) or outlier count indicates\n");
    fprintf(stderr, "that the retry mechanism is being exercised frequently.\n");
    fprintf(stderr, "==============================================================\n");
    
    /* Test ML-DSA variants (OpenSSL 3.5+ naming) */
    /* ML-DSA-44 = Dilithium2 (NIST Level 2) */
    /* ML-DSA-65 = Dilithium3 (NIST Level 3) - recommended */
    /* ML-DSA-87 = Dilithium5 (NIST Level 5) */
    
    /* Try ML-DSA-65 first (most common) */
    if (test_algorithm("ML-DSA-65")) {
        tested++;
    }
    
    /* Also test ML-DSA-44 and ML-DSA-87 for comparison */
    if (test_algorithm("ML-DSA-44")) {
        tested++;
    }
    
    if (test_algorithm("ML-DSA-87")) {
        tested++;
    }
    
    /* Fallback: try legacy Dilithium names if ML-DSA not found */
    if (tested == 0) {
        fprintf(stderr, "\nML-DSA not found, trying legacy Dilithium names...\n");
        
        if (test_algorithm("dilithium3")) {
            tested++;
        }
        if (test_algorithm("dilithium2")) {
            tested++;
        }
        if (test_algorithm("dilithium5")) {
            tested++;
        }
    }
    
    if (tested == 0) {
        fprintf(stderr, "\nNo ML-DSA/Dilithium algorithms available.\n");
        fprintf(stderr, "This test requires OpenSSL 3.5+ with PQC support.\n");
        printf("ml_dsa_available: false\n");
        return 1;
    }
    
    printf("ml_dsa_available: true\n");
    printf("ml_dsa_algorithms_tested: %d\n", tested);
    
    return 0;
}

