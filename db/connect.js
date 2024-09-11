var host = process.env.HOST_OPENSEARCH;
var protocol = "https";
var port = 443;
var auth = process.env.HOST_OPENSEARCH_AUTH; // For testing only. Don't store credentials in code.
// var ca_certs_path = "/full/path/to/root-ca.pem";

// Optional client certificates if you don't want to use HTTP basic authentication.
// var client_cert_path = '/full/path/to/client.pem'
// var client_key_path = '/full/path/to/client-key.pem'

// Create a client with SSL/TLS enabled.
var { Client } = require("@opensearch-project/opensearch");
var fs = require("fs");
var client = new Client({
  node: protocol + "://" + auth + "@" + host + ":" + port,
  //   ssl: {
  //     ca: fs.readFileSync(ca_certs_path),
  //     // You can turn off certificate verification (rejectUnauthorized: false) if you're using
  //     // self-signed certificates with a hostname mismatch.
  //     // cert: fs.readFileSync(client_cert_path),
  //     // key: fs.readFileSync(client_key_path)
  //   },
});

module.exports = client;
