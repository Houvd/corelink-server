# Logging

## What is logging?

A log is nothing but a record of an event or message that occurs during the execution of an application or system.
These events can include errors, warnings, informational messages, and other types of notifications that can help
developers or system administrators understand what is happening within the software. Logging can be done in various
ways, including writing messages to a file, sending messages to a centralized logging service, or writing messages to a
console or terminal.

The information included in a log message can vary depending on the context and purpose of the log. At a minimum, a
log message typically includes a timestamp that indicates when a particular event occurred, as well as a message that
describes the event or error. In addition, log messages may include other metadata such as the source of the message,
the severity of the event, or additional details about the system or application state at the time of the event.

Logs can be captured and written to a variety of destinations depending on the logging framework and configuration
being used. Some common destinations for logs include:

1. **Local File System**: The simplest and most common destination for logs is the local file system. Logs can be written
   to a file in a specified directory, and the file can be rotated or compressed over time to conserve disk space. This
   approach is often used for small to medium-sized applications or for local testing and development.

2. **Standard Output**: Another common destination for logs is the standard output (e.g. console or terminal). This can
   be useful for debugging or troubleshooting in development environments, as developers can see the log output in
   real-time as the application runs.

3. **Remote Log Aggregation Service**: For larger or distributed applications, logs may be sent to a remote log
   aggregation service such as Splunk, Elasticsearch, or Graylog. These services allow logs from multiple sources to
   be collected, aggregated, and analyzed in a centralized location, making it easier to identify patterns and
   troubleshoot issues across a complex system.

4. **Database**: Some applications may store logs in a database for easy querying and analysis. This approach can be
   useful for applications with high log volume or for applications that need to retain log data for a long time.

5. **Custom Transports**: In addition to the above options, logging frameworks often provide the flexibility to write
   log output to custom destinations. For example, logs could be sent to an external message queue, sent as email
   notifications, or even posted to a social media platform.


## Motivation

Once the log messages are collected, they can be stored and analyzed to identify patterns or trends in the system behavior.
These logs can then be used to troubleshoot issues, identify performance bottlenecks, or track down security vulnerabilities.

While using `console.log` statements in Node.js is a quick and easy way to output log messages, using a dedicated logging
framework like Winston, Bunyan, or Pino provides several advantages over this approach. The following considerations are
listed based on the requirement priorities of the `corelink-server`:

1. **Performance**: Logging frameworks are designed to be more efficient and scalable than console.log. For example,
   they may use asynchronous I/O or other optimizations to minimize the impact of logging on application performance.

2. **Flexibility**: Logging frameworks provide a more flexible and configurable way to manage log output than `console.log`.
   With a logging framework, you can easily change the destination of logs (e.g. files, databases, or third-party logging services) or customize the log format without changing your application code.

3. **Log Levels**: Most logging frameworks support different log levels (e.g. `debug`, `info`, `warn`, `error`, etc.) that
   can be used to control the verbosity of log output. This makes it easier to manage log volume and troubleshoot issues
   by focusing on the most relevant log messages.

4. **Centralized Management**: By using a logging framework, logs can be centrally managed and analyzed, even if they
   are being written to multiple destinations. This can be especially useful in larger or distributed systems where logs may be generated from multiple sources.

5. **Log Rotation**: Many logging frameworks include built-in support for log rotation, which can help prevent log files
   from consuming too much disk space over time.


## Logging Frameworks

There are several popular logging frameworks available for Node.js - some of the most commonly used logging frameworks for Node.js include:

1. [Winston](https://github.com/winstonjs/winston): Winston is one of the most popular logging frameworks for Node.js.
   It provides a simple and flexible API for logging messages, with support for logging to multiple destinations
   (e.g. files, console, or third-party logging services). Winston also supports log levels, log rotation, and custom
   log formats.

2. [Bunyan](https://github.com/trentm/node-bunyan): Bunyan is another popular logging framework for Node.js. It is
   designed to be simple, fast, and scalable, with support for logging to files, streams, and syslog. Bunyan also
   includes features like log levels, log rotation, and log filtering.

3. [Pino](https://github.com/pinojs/pino): Pino is a lightweight and extremely fast logging framework for Node.js. It
   is designed for low-overhead and high-throughput applications, making it a good choice for high-performance applications.
   Pino supports logging to files, streams, and syslog, and includes features like log levels, log rotation, and log filtering.

4. [Log4js](https://github.com/stritti/log4js): Log4js is a logging framework that is heavily inspired by the Java-based
   Log4j library. It provides a simple and intuitive API for logging messages, with support for logging to files,
   streams, and syslog. Log4js also includes features like log levels, log rotation, and log filtering.

## Pino

Based on the considerations listed above, Pino is the better choice for logging in `corelink-server`. It is a logging
framework for Node.js, known for its high performance and low memory overhead. What distinguishes Pino from other popular
logging frameworks is:

1. **Batching**: Batched logging is a technique where log messages are collected and written to the log in batches,
   rather than individually. This can help reduce the overhead of writing log messages, especially in high-volume
   logging environments.

    <figure>
        <center><img width=620 height=300 src="https://miro.medium.com/v2/resize:fit:1400/format:webp/1*RIm7-n2ukjm6ZYt80Y_BCg.png"/></center>
        <center><figcaption><a href="https://miro.medium.com/v2/resize:fit:1400/format:webp/1*RIm7-n2ukjm6ZYt80Y_BCg.png">Synchronous writing to stdout</a></figcaption></center>
    </figure>

   <br>
   <br>

    <figure>
        <center><img width=620 height=300 src="https://miro.medium.com/v2/resize:fit:4800/format:webp/1*lByLeFEFhWdNuAsxptTsGQ.png"/></center>
        <center><figcaption><a href="https://miro.medium.com/v2/resize:fit:4800/format:webp/1*lByLeFEFhWdNuAsxptTsGQ.png">Buffered writing output to file</a></figcaption></center>
    </figure>

2. **Worker Threads**: Due to Node's single-threaded event-loop, it's highly recommended that sending, alert triggering,
    reformatting, and all forms of log processing are conducted in a separate process or thread.

3. **Async Logging**: In addition to batching, asynchronous logging enables the minimum overhead of Pino. Asynchronous logging works by
   buffering log messages and writing them in larger chunks.

    ```js
    const pino = require('pino');
    const logger = pino(pino.destination({
        dest: './my-file', // omit for stdout
        minLength: 4096, // Buffer before writing
        sync: false // Asynchronous logging
    }));
    ```

    It's possible to turn on synchronous logging by passing `sync: true`. In this mode of operation, log messages are directly written to the output stream as the messages are generated with a blocking operation.

    A few things to note, however:
    - As opposed to the synchronous mode, there is not a one-to-one relationship between calls to logging methods (e.g. logger.info) and writes to a log file.
    - There is a possibility of the most recently buffered log messages being lost in case of a system failure.

4. **Transports**: Pino transports can be used for both transmitting and transforming log output. The way Pino generates logs:
   1. Reduces the impact of logging on an application to the absolute minimum.
   2. Gives greater flexibility in how logs are processed and stored.

    It is recommended that any log transformation or transmission is performed either in a separate thread or a separate process.

## Benchmarks

In addition to the [existing popular benchmarks](https://github.com/pinojs/pino/blob/master/docs/benchmarks.md), the
subsequent benchmarks were performed locally, using vanilla express server setup to test the performance against the
baseline setup, and Console APIs. Benchmarks log each info and error message pair while returning 'hello world',
using autocannon with 10 connections.

### Baseline (without logging)

```js
const app = require('express')();

app.get('/', function(req, res) {
    res.send('Hello, world!');
});

app.listen(3000);
```

```
> autocannon -c 10 -d 60 http://localhost:3000
Running 60s test @ http://localhost:3000
10 connections


┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼───────┤
│ Latency │ 1 ms │ 1 ms │ 3 ms  │ 4 ms │ 1.41 ms │ 0.85 ms │ 42 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴───────┘
┌───────────┬────────┬────────┬─────────┬─────────┬─────────┬─────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%     │ 97.5%   │ Avg     │ Stdev   │ Min    │
├───────────┼────────┼────────┼─────────┼─────────┼─────────┼─────────┼────────┤
│ Req/Sec   │ 3109   │ 3687   │ 5123    │ 5191    │ 5039.14 │ 331.36  │ 3108   │
├───────────┼────────┼────────┼─────────┼─────────┼─────────┼─────────┼────────┤
│ Bytes/Sec │ 746 kB │ 885 kB │ 1.23 MB │ 1.25 MB │ 1.21 MB │ 79.6 kB │ 746 kB │
└───────────┴────────┴────────┴─────────┴─────────┴─────────┴─────────┴────────┘

Req/Bytes counts sampled once per second.
# of samples: 60

302k requests in 60.02s, 72.6 MB read
```

### Console

```js
const app = require('express')();

app.get('/', function(req, res) {
    console.log('some log message');
    console.error('some error message');
    res.send('Hello, world!');
});

app.listen(3000);
```

```
> autocannon -c 10 -d 60 http://localhost:3000                                                                                                                utsavoza at mbp
Running 60s test @ http://localhost:3000
10 connections


┌─────────┬──────┬──────┬───────┬───────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%   │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼───────┼─────────┼─────────┼───────┤
│ Latency │ 2 ms │ 3 ms │ 12 ms │ 32 ms │ 4.05 ms │ 4.59 ms │ 93 ms │
└─────────┴──────┴──────┴───────┴───────┴─────────┴─────────┴───────┘
┌───────────┬────────┬────────┬────────┬────────┬─────────┬─────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%    │ 97.5%  │ Avg     │ Stdev   │ Min    │
├───────────┼────────┼────────┼────────┼────────┼─────────┼─────────┼────────┤
│ Req/Sec   │ 1333   │ 1718   │ 2247   │ 2397   │ 2203.34 │ 167.19  │ 1333   │
├───────────┼────────┼────────┼────────┼────────┼─────────┼─────────┼────────┤
│ Bytes/Sec │ 320 kB │ 412 kB │ 540 kB │ 575 kB │ 529 kB  │ 40.1 kB │ 320 kB │
└───────────┴────────┴────────┴────────┴────────┴─────────┴─────────┴────────┘

Req/Bytes counts sampled once per second.
# of samples: 60

132k requests in 60.06s, 31.7 MB read
```

### Winston

```js
const app = require('express')();
const winston = require('winston');
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
    ),
    transports: [
        new winston.transports.Console()
    ]
});

app.get('/', function(req, res) {
    logger.info("Some log message");
    logger.error("Some error message");
    res.send('Hello, world!');
});

app.listen(3000);
```

```
> autocannon -c 10 -d 60 http://localhost:3000                                                                                                                utsavoza at mbp
Running 60s test @ http://localhost:3000
10 connections


┌─────────┬──────┬──────┬───────┬───────┬────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%   │ Avg    │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼───────┼────────┼─────────┼───────┤
│ Latency │ 2 ms │ 3 ms │ 11 ms │ 31 ms │ 3.9 ms │ 4.36 ms │ 94 ms │
└─────────┴──────┴──────┴───────┴───────┴────────┴─────────┴───────┘
┌───────────┬────────┬────────┬────────┬────────┬─────────┬────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%    │ 97.5%  │ Avg     │ Stdev  │ Min    │
├───────────┼────────┼────────┼────────┼────────┼─────────┼────────┼────────┤
│ Req/Sec   │ 1417   │ 1439   │ 2307   │ 2623   │ 2274.02 │ 233.67 │ 1417   │
├───────────┼────────┼────────┼────────┼────────┼─────────┼────────┼────────┤
│ Bytes/Sec │ 340 kB │ 346 kB │ 554 kB │ 630 kB │ 546 kB  │ 56 kB  │ 340 kB │
└───────────┴────────┴────────┴────────┴────────┴─────────┴────────┴────────┘

Req/Bytes counts sampled once per second.
# of samples: 60

136k requests in 60.07s, 32.7 MB read
```

### Pino

```js
const app = require('express')();
const pino = require('pino');
const logger = pino(); // default config and transport

app.get('/', function(req, res) {
    logger.info("Some log message");
    logger.error("Some error message");
    res.send('Hello, world!');
});

app.listen(3000);
```

```
Running 60s test @ http://localhost:3000
10 connections


┌─────────┬──────┬──────┬───────┬──────┬─────────┬────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev  │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼────────┼───────┤
│ Latency │ 1 ms │ 2 ms │ 6 ms  │ 9 ms │ 2.33 ms │ 2.3 ms │ 99 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴────────┴───────┘
┌───────────┬────────┬────────┬────────┬────────┬─────────┬─────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%    │ 97.5%  │ Avg     │ Stdev   │ Min    │
├───────────┼────────┼────────┼────────┼────────┼─────────┼─────────┼────────┤
│ Req/Sec   │ 1942   │ 2807   │ 3493   │ 4007   │ 3503.15 │ 317.23  │ 1942   │
├───────────┼────────┼────────┼────────┼────────┼─────────┼─────────┼────────┤
│ Bytes/Sec │ 466 kB │ 674 kB │ 839 kB │ 962 kB │ 841 kB  │ 76.2 kB │ 466 kB │
└───────────┴────────┴────────┴────────┴────────┴─────────┴─────────┴────────┘

Req/Bytes counts sampled once per second.
# of samples: 60

210k requests in 60.02s, 50.4 MB read
```

