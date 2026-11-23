---
title: "Java keystores, keytool and Tomcat"
description: How Java stores certificates and keys, the keytool commands you actually need, and how to renew a Tomcat certificate safely.
---

**Slides for this page** are in the [Seb, Clint and the padlock](/present/tls-trust/) deck. Slide numbers are shown under each section.

Java does certificates its own way. It **doesn't use the Windows certificate store** by default, it keeps keys in **keystore files**, and it has its own list of trusted CAs. Most "it works in the browser but not in the app" problems on Java servers come from that.

## Two kinds of store

*📽️ Slide [29](/present/tls-trust/#29)*


| | Keystore | Truststore |
|---|---|---|
| Holds | **Your** private key + certificate + chain | **Other people's** CA certificates you trust |
| Used for | Proving who *you* are (Tomcat serving HTTPS) | Checking who *they* are (your app calling an API, LDAPS, SQL) |
| Contains secrets? | **Yes: the private key** | No, only public certs |
| Typical file | `conf/app.p12`, `keystore.jks` | `$JAVA_HOME/lib/security/cacerts` |

They're often confused because they use the same file formats and the same tool. Keep them separate in your head: **keystore = my identity, truststore = who I trust.**

## File formats

| Format | Notes |
|---|---|
| **PKCS12** (`.p12`, `.pfx`) | The standard format. Default since Java 9. Readable by Windows, OpenSSL and everything else. **Use this.** |
| **JKS** (`.jks`) | Java's old proprietary format. Still common in older apps and vendor installs. Convert to PKCS12 when you can. |
| **PEM** (`.pem`, `.crt`, `.key`) | Text files. Tomcat 8.5 and later can use them directly instead of a keystore. |

Each entry in a keystore has an **alias** (a name). A **PrivateKeyEntry** holds a key + certificate chain; a **trustedCertEntry** holds only a certificate.

## The keytool commands you'll actually use

`keytool` ships with every JDK/JRE (`$JAVA_HOME/bin/keytool`). Use the one from **the same Java the app runs on**.

### Look inside a keystore

```bash
keytool -list -v -keystore conf/app.p12 -storetype PKCS12
```

Check: the alias, `Entry type: PrivateKeyEntry`, the **SubjectAlternativeName** extension, **Valid until**, and the **Certificate chain length** (should be at least 2: your cert plus our CA).

### Create a new key and CSR (for a new cert or a renewal)

Generate the key **inside a new keystore on the server itself**, so the private key never leaves it:

```bash
keytool -genkeypair -alias tomcat -keyalg RSA -keysize 2048 \
  -dname "CN=app.rrc.qld.gov.au, O=Rockhampton Regional Council, C=AU" \
  -ext "SAN=dns:app.rrc.qld.gov.au,dns:app01.corp.local" \
  -keystore conf/app-2026.p12 -storetype PKCS12

keytool -certreq -alias tomcat -keystore conf/app-2026.p12 \
  -ext "SAN=dns:app.rrc.qld.gov.au,dns:app01.corp.local" \
  -file app-2026.csr
```

- Put **every name users and other systems use** in the SAN list. The CN alone isn't enough.
- Name the new keystore with the year so it doesn't overwrite the one currently in use.
- Send the `.csr` to the CA (it contains only the public key, so it's safe to send).

### Import the CA chain, then the signed certificate

When the CA sends back the certificate, import the CA certificate first, then your certificate **using the same alias as the key**:

```bash
keytool -importcert -trustcacerts -alias rrc-root -file rrc-root-ca.cer \
  -keystore conf/app-2026.p12 -storetype PKCS12

keytool -importcert -alias tomcat -file app-2026.cer \
  -keystore conf/app-2026.p12 -storetype PKCS12
```

You should see `Certificate reply was installed in keystore`. If you see `Failed to establish chain from reply`, keytool couldn't find the issuing CA: import the CA cert first. If it says the alias already exists as a `trustedCertEntry`, you used the wrong alias: it must match the key's alias (`tomcat` here).

### Trust our internal CA (truststore)

So the app can call internal HTTPS, LDAPS or SQL services:

```bash
keytool -importcert -cacerts -alias rrc-root -file rrc-root-ca.cer
```

`-cacerts` (Java 9+) targets the JVM's own `cacerts`. The default password is `changeit`, which is fine for a truststore since it holds nothing secret.

**Gotcha:** many vendor apps bundle **their own Java**, with their own `cacerts`. A Java or app upgrade can **replace that file and silently remove our CA**. Write it into your upgrade checklist, or point the app at a separate truststore with `-Djavax.net.ssl.trustStore=…` so upgrades don't touch it. On Windows, Java 11+ can also use the Windows trust store with `-Djavax.net.ssl.trustStoreType=Windows-ROOT`.

### Convert a JKS keystore to PKCS12

```bash
keytool -importkeystore -srckeystore keystore.jks -srcstoretype JKS \
  -destkeystore keystore.p12 -deststoretype PKCS12
```

## Tomcat configuration

Tomcat's HTTPS settings live in `conf/server.xml`:

```xml
<Connector port="8443" protocol="org.apache.coyote.http11.Http11NioProtocol"
           SSLEnabled="true" maxThreads="150">
  <SSLHostConfig protocols="TLSv1.2,TLSv1.3">
    <Certificate certificateKeystoreFile="conf/app-2026.p12"
                 certificateKeystoreType="PKCS12"
                 certificateKeystorePassword="${keystore.password}"
                 type="RSA" />
  </SSLHostConfig>
</Connector>
```

- `protocols="TLSv1.2,TLSv1.3"` keeps old TLS versions off.
- The keystore password is effectively the private key's password. Keep `server.xml` readable only by the Tomcat service account and admins, or keep the password out of the file (for example as a property set at startup, as above).
- Older apps may use the legacy attributes `keystoreFile` / `keystorePass` directly on `<Connector>`. Same idea.

## Renewing a Tomcat certificate: the safe way

*📽️ Slide [30](/present/tls-trust/#30)*


1. **Check what's there now:** `keytool -list -v` on the current keystore. Note the names (SAN), expiry and which file `server.xml` points to.
2. **Make a new key and CSR in a new keystore** (`app-2026.p12`) using the commands above. Use a **new key** each renewal; don't reuse the old one.
3. **Get it signed** by the CA (internal or public, depending on who connects).
4. **Import the CA chain, then the certificate** into the new keystore. Run `keytool -list -v` and confirm chain length ≥ 2 and the right SANs.
5. **Point `server.xml` at the new keystore.** Keep the old file for rollback.
6. **Restart Tomcat** in a change window, and test from **another machine**:
   ```bash
   openssl s_client -connect app.rrc.qld.gov.au:8443 -servername app.rrc.qld.gov.au </dev/null
   ```
   Look for the new expiry date and both certificates in the chain.
7. **Clean up:** once it's confirmed working, delete the old keystore and any CSR or temp files. Update the certificate record (owner, expiry, location) in the CMDB.

## Common Java errors

*📽️ Slide [31](/present/tls-trust/#31)*


| Error | Usually means |
|---|---|
| `PKIX path building failed: unable to find valid certification path` | The **truststore** doesn't have the CA that signed the server's cert. Import our root (or check for TLS inspection). |
| `No subject alternative names matching IP address … found` | Connecting by IP. Use the hostname, and make sure it's in the SAN. |
| `Failed to establish chain from reply` | Importing a cert before its CA. Import the CA first. |
| `Keystore was tampered with, or password was incorrect` | Wrong password, or wrong `-storetype` |
| `Alias <tomcat> does not exist` | Alias typo. `keytool -list` shows the real names. |
| Tomcat starts but serves the **old** cert | `server.xml` still points at the old keystore, or a reverse proxy in front has its own cert |
