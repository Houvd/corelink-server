for i in {0..600000}
do
  echo > /dev/tcp/10.0.0.6/$i && echo "Port is open $i"
done
