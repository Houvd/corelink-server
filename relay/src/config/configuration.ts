export namespace Corelink {
    export namespace Configuration {
        export const configuration = {
            logging: {
                logLevel: "normal",
                enableFileLogging: false,
                enableConsoleLogging: true,
                logDir: "./../logs",
                fileNamePattern: "relay-service.log"
            },
            relay: {
                controlPort: 20020,
                websocketDataPort: 20030,
                tcpDataPort: 20031,
                udpDataPort: 20032,
                peerServices: [
                    {
                        service: "controlService",
                        url: "corelink.hpc.nyu.edu",
                        controlPortNo: 20012,
                        protocol: "ws"
                    }
                ]
            }
        };
    }
}