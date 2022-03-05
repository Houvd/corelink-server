#import sys
import subprocess
#import os
import argparse
import time

parser = argparse.ArgumentParser()
parser.add_argument("ipad", help = "Show Output")
parser.add_argument("startport", help = "Show Output")
parser.add_argument("endport", help = "Show Output")

args = parser.parse_args()
#argv #ip, startport, endport
for i in range(int(args.startport), int(args.endport)):
        porthold = "/dev/tcp/" + str(args.ipad) + "/" + str(i)
        process = subprocess.Popen(['echo', '>', porthold, "&&", "echo", "Port is Open"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        #echo > /dev/tcp/10.0.0.6/22 && echo "Port is open"
        while True:
                output = process.stdout.readline()
                if output:
                        print(output.strip())
                        break