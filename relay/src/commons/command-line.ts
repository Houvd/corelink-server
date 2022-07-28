import * as commander from "commander";
import { argv } from "process";

export namespace Corelink {
    export type CommandLineArguments = {
        /**
         * overrides configuration item to enable file logging, if disabled. Has not effect if already enabled.
         */
        enableFileLogging?: boolean;
        /**
         * overrides configuration item to enable console logging, if disabled. Has not effect if already enabled.
         */
        enableConsoleLogging?: boolean;
        /**
         * override the log level in the configuration if supplied
         */
        logLevel?: string;
        /**
         * overrides relay service control port no. in configuration
         */
        WsControlPortNo?: number;
        /**
         * overrides relay service websocket data port no. in configuration
         */
        websocketDataPortNo?: number;
        /**
         * overrides relay service TCP data port no. in configuration
         */
        tcpDataPortNo?: number;
        /**
         * overrides relay service UDP data port no. in configuration
         */
        udpDataPortNo?: number;
        /**
         * overrides control service control URL in configuration
         */
        controlServiceURL?: string;
        /**
         * overrides control service control port no. in configuration
         */
        controlServiceControlPortNo: number;
    };

    const commandLineOptionParser = commander.createCommand("Command Line Parser")
        .addOption(
            new commander.Option(
                "-en-file, --enable-file-logging", "Enable file logging. If not supplied, the value will be defaulted from the configuration."
            ).default(null))
        .addOption(
            new commander.Option(
                "-en-con, --enable-console-logging", "Enable console logging. If not supplied, the value will be defaulted from the configuration."
            ).default(null)
        ).addOption(
            new commander.Option(
                "-ll, --log-level", "Override the log level in configuration. If not supplied, value will be defaulted from configuration."
            ).default(null).argParser((val, prev) => {
                console.log(val);
                console.log(prev);
            })
        );

    export function parseAndSetup(): CommandLineArguments {
        try {
            return commandLineOptionParser.parse(argv).opts();
        }
        catch (ex) {
            console.log(ex);
        }
        return {} as CommandLineArguments;
    }
}