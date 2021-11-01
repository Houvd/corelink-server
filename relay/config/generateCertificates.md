
CA Key 
openssl genrsa -out ca-key.pem 4096

Create CA
openssl req -new -x509 -key ca-key.pem -days 9999 -out ca-crt.pem -config ca.cnf

Create CSR
openssl req -nodes -new -days 9999 -config server.cnf -keyout server-key.pem -out server-csr.pem

Sign
openssl x509 -req -days 9999 -extfile server.cnf -extensions req_ext -in server-csr.pem -CA ca-crt.pem -CAkey ca-key.pem -CAcreateserial -out server-crt.pem

Test for alternative names
openssl req -in server-csr.pem -noout -text

Check Cert
openssl verify -CAfile ca-crt.pem server-crt.pem