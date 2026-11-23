---
title: "Our PKI at RRC: getting and installing certificates"
description: How RRC's internal CA works, how to request a SAN certificate, and how to install it on IIS, SQL Server and RDP.
---

**Slides for this page** are in the [Certificates for Corp Apps](/present/corp-apps-pki/) deck. Slide numbers are shown under each section.

There are around **50 to 100 internal certificates** at RRC. If you run servers, you **will** be asked to request, install or renew one. This page is the how-to.

## How our PKI works

| | |
|---|---|
| **The CA** | An internal **Active Directory Certificate Services (AD CS)** CA. Your PKI admins can tell you how it's laid out. |
| **Templates** | Standard AD CS templates (e.g. *Web Server*) |
| **Who issues** | **The PKI admins.** Corp Apps creates the request; the PKI admins sign it. |
| **Revocation (CRL) and CA cert (AIA)** | Published so clients can check whether a cert has been cancelled |
| **How machines trust it** | **Group Policy** pushes the root to domain-joined Windows machines. Some systems need it added **manually**. |

### Why the CA matters so much

*📽️ Slide [7](/present/corp-apps-pki/#7)*

Whoever controls an internal CA, or can enrol for any name through it, can create a trusted certificate for **any** internal site, and every domain-joined PC will believe it. (Remember [DigiNotar](/pki-tls/history/#certificate-authority-incidents).)

- That's why requests go through the PKI admins rather than self-service. The standard *Web Server* template lets the requester choose the names on the certificate, so who can enrol on it has to be tightly controlled.
- In a **two-tier** PKI, an offline root signs an online issuing CA, which issues server certs. In a **single-tier** PKI, the root issues directly. Either way, the CA's key is the most sensitive key in the organisation.
- If a CA key were ever compromised, trust would have to be replaced on every machine. Protecting it is everyone's job: don't ask for broad enrolment rights "to save time".

### Where GPO doesn't reach

Group Policy only puts our root into the **Windows** trust store on **domain-joined** machines. Everything else needs our root CA certificate added by hand, and has to be re-checked after upgrades:

| System | Where to add our root |
|---|---|
| **Java apps / Tomcat** | The JVM's `cacerts`, or the app's own truststore ([how](/pki-tls/java-tomcat/#trust-our-internal-ca-truststore)) |
| **vSphere / vCenter, appliances** | The product's trusted root store (web UI or CLI) |
| **Linux servers** | `/usr/local/share/ca-certificates/` then `update-ca-certificates` (Debian/Ubuntu) |
| **Python / Node / PHP apps** | Their CA bundle, or point them at the OS store |
| **Non-domain PCs, phones, vendor laptops** | They won't trust internal certs. Anything they use needs a **public** certificate. |

Get our root certificate (`.cer`) from the PKI admins. It's public, so it's safe to copy around.

## Requesting a SAN certificate (IIS and other Windows services)

*📽️ Slide [8](/present/corp-apps-pki/#8)*

The private key should be **created on the server that will use it** and should **never leave it**. So you make the request on the server, and the PKI admins sign it.

### 1. Decide the names

List every name people and systems use to reach the service. All of them go in the **Subject Alternative Name (SAN)**:

- The friendly name: `app.rrc.qld.gov.au` or `app.corp.local`
- The server's own FQDN if anything uses it: `app01.corp.local`
- **Not** short names like `app01` or IP addresses unless there's a real need

### 2. Create the request on the server

*📽️ Slide [9](/present/corp-apps-pki/#9)*

**Option A: the GUI (`certlm.msc`)**

1. Run `certlm.msc` (Local Computer certificates) as admin.
2. *Personal → Certificates* → right-click → *All Tasks → Advanced Operations → Create Custom Request*.
3. *Proceed without enrollment policy* → *(No template) CNG key* → *PKCS #10*.
4. *Details → Properties*:
   - **Subject** tab: Subject name *Common name* = `app.rrc.qld.gov.au`. Alternative name *DNS* = add **each** name.
   - **Extensions** tab: Extended Key Usage = *Server Authentication*.
   - **Private Key** tab: key size **2048** (or more), and make sure *Make private key exportable* is **unticked**.
5. Save the `.req` file.

**Option B: `certreq` with an INF file (repeatable)**

Save as `app.inf`:

```ini
[NewRequest]
Subject = "CN=app.rrc.qld.gov.au, O=Rockhampton Regional Council, C=AU"
KeySpec = 1
KeyLength = 2048
Exportable = FALSE
MachineKeySet = TRUE
ProviderName = "Microsoft RSA SChannel Cryptographic Provider"
ProviderType = 12
RequestType = PKCS10
KeyUsage = 0xa0

[EnhancedKeyUsageExtension]
OID = 1.3.6.1.5.5.7.3.1

[Extensions]
2.5.29.17 = "{text}"
_continue_ = "dns=app.rrc.qld.gov.au&"
_continue_ = "dns=app01.corp.local"
```

Then:

```powershell
certreq -new app.inf app.req
```

### 3. Send the request to the PKI admins

Send **only the `.req` file** to the PKI admins (it contains just the public key and the names). Say what the cert is for, who owns the service, and which names you need. They'll issue it and send back a `.cer`.

### 4. Install the certificate

On the **same server** that made the request:

```powershell
certreq -accept app.cer
```

Or in `certlm.msc`, import the `.cer` into *Personal → Certificates*. Either way, Windows pairs it with the waiting private key. Check the cert shows the **key icon** and *"You have a private key that corresponds to this certificate"*.

> **No key icon?** The cert was imported on a different server from the one that made the request, or the pending request was deleted. Don't export a key from elsewhere to fix it; make a new request on this server.

### 5. Use it

*📽️ Slides [10](/present/corp-apps-pki/#10), [11](/present/corp-apps-pki/#11)*

| Service | How |
|---|---|
| **IIS** | IIS Manager → site → *Bindings* → *https* → pick the certificate. Tick *Require Server Name Indication* if several sites share the IP. |
| **SQL Server** | SQL Server Configuration Manager → *SQL Server Network Configuration* → *Protocols for <instance>* → *Certificate* tab → pick it. Grant the **SQL service account Read** on the private key (`certlm.msc` → cert → *All Tasks → Manage Private Keys*). **Restart** the SQL service. |
| **RDP** | Assign by thumbprint (below), or ask the PKI admins about a GPO that issues RDP certs automatically. |

Set the RDP certificate by thumbprint (run as admin):

```powershell
$thumb = (Get-ChildItem Cert:\LocalMachine\My |
  Where-Object { $_.Subject -like "*app01.corp.local*" } |
  Sort-Object NotAfter -Descending | Select-Object -First 1).Thumbprint
$ts = Get-CimInstance -Namespace root\cimv2\TerminalServices `
  -ClassName Win32_TSGeneralSetting -Filter "TerminalName='RDP-tcp'"
Set-CimInstance -InputObject $ts -Property @{ SSLCertificateSHA1Hash = $thumb }
```

### 6. Test and record

- Browse to every name in the SAN from **another machine**, or run `openssl s_client -connect app.rrc.qld.gov.au:443 -servername app.rrc.qld.gov.au`.
- For SQL, connect with **`Encrypt=True` and without `TrustServerCertificate`**. If it works, the cert is right.
- Record the certificate (service, server, owner, expiry, thumbprint) in the CMDB, and set a reminder well before it expires.

## Renewing

Renewal is the same process: **new request on the server, new key, new cert**. Then switch the binding to the new certificate, test, and **delete the old certificate** from the store. Don't wait until the expiry date: renew with at least a couple of weeks' margin so there's time to fix surprises.

For Tomcat and other Java apps, follow [Java keystores and Tomcat](/pki-tls/java-tomcat/#renewing-a-tomcat-certificate-the-safe-way). The PKI admin side is identical.

## Internal or public certificate?

*📽️ Slide [7](/present/corp-apps-pki/#7)*

| If the service is used by… | Use |
|---|---|
| Only domain-joined RRC PCs and servers | **Internal** cert from our CA |
| Anyone outside the domain: the public, phones, vendors, SaaS, non-domain devices | **Public** cert from a public CA |

Our internal CA can't give you a certificate the outside world trusts, and a public CA can't issue for `.local` names.
