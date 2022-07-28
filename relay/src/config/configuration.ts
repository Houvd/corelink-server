export namespace Corelink {
    export namespace Configuration {
        /**
         * Corelink relay server configuration object
         */
        export const configuration = {
            /**
             * Logging related items
             */
            logging: {
                logLevel: "normal",
                enableFileLogging: false,
                enableConsoleLogging: true,
                logDir: "./../logs",
                fileNamePattern: "relay-service.log"
            },
            peerServices: {
                controlService: {
                    hostname: "corelink.hpc.nyu.edu",
                    controlPortNo: 20012,
                    protocol: "ws"
                },
                monitoringService: {
                    hostname: "corelink.hpc.nyu.edu",
                    controlPortNo: 20012,
                    protocol: "ws"
                },
            },
            relay: {
                controlPort: 20020,
                websocketDataPort: 20030,
                tcpDataPort: 20031,
                udpDataPort: 20032,
                connectedServices: ["controlService", "monitoringService"]
            }
        };
    }
}