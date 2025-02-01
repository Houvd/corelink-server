#include <nats.h>
#include <cstring>
#include <sys/time.h>
#include <stdlib.h>

#define PAYLOAD_SIZE 1024
#define HEADER_SIZE 14
#define MESSAGE_SIZE (HEADER_SIZE + PAYLOAD_SIZE)

int64_t receivedCount = 0;
int64_t totalTransitTime = 0;
float jitter = 0;
int64_t lastTransitTime = -1;
int64_t interArrivalTime = -1;
float totalJitter = 0;
bool receiving = true;



void onMsg(natsConnection *nc, natsSubscription *sub, natsMsg *msg, void *closure) {
    // printf("Received msg: %s - %.*s\n",
    //        natsMsg_GetSubject(msg),
    //        natsMsg_GetDataLength(msg),
    //        natsMsg_GetData(msg));

    const uint8_t *fullBuffer = (const uint8_t *)natsMsg_GetData(msg);
    size_t msgSize = natsMsg_GetDataLength(msg);

    uint16_t headerType;
    uint32_t dataSize;
    int64_t timestamp;

    memcpy(&headerType, fullBuffer, sizeof(headerType));   // Read 2 bytes (Little Endian)
    memcpy(&dataSize, fullBuffer + 2, sizeof(dataSize));   // Read 4 bytes
    memcpy(&timestamp, fullBuffer + 6, sizeof(timestamp)); // Read 8 bytes

    // Print extracted values
    // printf("Header Type: %u\n", (unsigned int)headerType);
    // printf("Data Size: %u\n", (unsigned int)dataSize);
    printf("Timestamp: %" PRId64 "\n", timestamp);

    struct timeval tv;
    gettimeofday(&tv, NULL);
    int64_t newTransitTime = (int64_t)tv.tv_sec * 1000000 + tv.tv_usec - timestamp;

    if (lastTransitTime == -1) {
        lastTransitTime = newTransitTime;
    } else {
        interArrivalTime = newTransitTime - lastTransitTime;
        lastTransitTime = newTransitTime;
        jitter = jitter + ((llabs(interArrivalTime) - jitter) / 16);
        // console.log('Jitter = ', jitter, " us");
        totalJitter += jitter;
    }
    printf("Jitter: %.2f µs\n", jitter);
    printf("interArrivalTime: %" PRId64 "\n", llabs(interArrivalTime));
    receivedCount++;
    totalTransitTime += newTransitTime;

    if (receivedCount == 25000 - 1) {
        int64_t avgTransitTime = totalTransitTime / receivedCount;
        float avgJitter = totalJitter / receivedCount;

        printf("Average Transit Time: %" PRId64 "\n", avgTransitTime);
        printf("Average Jitter: %.2f µs\n", avgJitter);


    }

    natsMsg_Destroy(msg);
}

int main(int argc, char **argv) {
    natsConnection      *conn  = NULL;
    natsOptions         *opts  = NULL;
    natsSubscription    *sub   = NULL;
    bool                closed = false;
    natsStatus          s;
    const char          *subj = "benchmarking";

    struct timespec req = {0};
    req.tv_sec = 0;
    req.tv_nsec = 1000000L;

    natsOptions_Create(&opts);

    char *serverUrls[1];
    char* urlCopy = NULL;
    urlCopy = strdup(argv[1]);

    memset(serverUrls, 0, sizeof(serverUrls));

    char* ptr = urlCopy;
    serverUrls[0] = ptr;
    // s = natsOptions_SetURL(opts, "127.0.0.1:4222");
    printf("URL: %s\n", argv[1]);

    s = natsOptions_SetServers(opts, (const char**) serverUrls, 1);

    if (s != NATS_OK)
    {
        fprintf(stderr, "Error setting URL: %d - %s\n", s, natsStatus_GetText(s));
        // ...
    }
    free(urlCopy);

    int64_t start = nats_Now();
    s = natsConnection_Connect(&conn, opts);

    if (s != NATS_OK)
    {
        fprintf(stderr, "Error connecting to NATS: %d - %s\n",
                s, natsStatus_GetText(s));
        natsOptions_Destroy(opts);
        return 1;
    }

    s = natsOptions_SetMaxReconnect(opts, 50);
    if (s == NATS_OK)
        s = natsOptions_SetReconnectWait(opts, 100);

    if (s != NATS_OK)
    {
        printf("Error here: %u - %s\n", s, natsStatus_GetText(s));
        nats_PrintLastErrorStack(stderr);
        exit(1);
    }

    int64_t elapsed = nats_Now() - start;

    printf("natsConnection_Connect call took %" PRId64 " ms and returned: %s\n", elapsed, natsStatus_GetText(s));

    s = natsConnection_Subscribe(&sub, conn, subj, onMsg, NULL);
    // if (s == NATS_OK)
    //     s = natsConnection_Publish(conn, subj, (const void*)"hello", 5);

    for (int i = 0; i < 25000; i++) {
        struct timeval tv;
        gettimeofday(&tv, NULL);
        int64_t timestamp = (int64_t)tv.tv_sec * 1000000LL + tv.tv_usec;

        uint8_t payload[PAYLOAD_SIZE];
        memset(payload, 'A', PAYLOAD_SIZE);

        uint8_t header[HEADER_SIZE];
        memset(header, 0, HEADER_SIZE);
        *(uint16_t *)(header) = 1;
        *(uint32_t *)(header + 2) = PAYLOAD_SIZE;

        *(int64_t *)(header + 6) = timestamp;
        uint8_t message[MESSAGE_SIZE];
        memcpy(message, header, HEADER_SIZE);
        memcpy(message + HEADER_SIZE, payload, PAYLOAD_SIZE);

        s = natsConnection_Publish(conn, "benchmarking", message, MESSAGE_SIZE);
        nanosleep(&req, NULL);
    }

    natsConnection_Destroy(conn);
    return 0;
}
