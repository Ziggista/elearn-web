---
title: "Where private keys live, and why not to export them"
description: Where private keys are stored on websites, SQL Server, RDP and Tomcat, how to protect them, and how this ties to ISM-0507.
---

Everything about a certificate's trust rests on one assumption: **only the server holds the private key.** If a copy exists anywhere else, whoever has that copy can be that server.

## ISM-0507

> **Control: ISM-0507; Revision: 5; Updated: Dec-22; Applicable: NC, OS, P, S, TS; Essential 8: N/A**
>
> Cryptographic key management processes, and supporting cryptographic key management procedures, are developed, implemented and maintained.

In plain terms: we need to **know where our keys are, who can use them, how they're created, renewed and destroyed, and what we do if one leaks**. Every time a private key is exported and copied around, that becomes harder to answer. The practices on this page are how app admins help us meet it.

## Where private keys live

| Resource | Where the key is | Who needs access |
|---|---|---|
| **IIS websites** | Windows machine key store, linked to the cert in *Local Computer → Personal* (`certlm.msc`) | The system (HTTP.sys). Admins. |
| **SQL Server** | Same Windows machine key store, selected in SQL Server Configuration Manager | The **SQL Server service account** needs *Read* on the key (right-click cert → All Tasks → Manage Private Keys) |
| **RDP** | Windows machine key store (the *Remote Desktop* store holds the default self-signed one) | The Remote Desktop service (NETWORK SERVICE) |
| **Domain controllers (LDAPS), ADFS, WinRM, other Windows services** | Windows machine key store | The service's account |
| **Tomcat / Java** | Inside a **keystore file** (`.p12` / `.jks`), protected by a password | The Tomcat service account. The password usually sits in `server.xml`. |
| **Apache / nginx / PHP on Linux** | A **`.key` file** on disk | `root` / the web server user. Permissions `600`. |
| **Load balancers, firewalls, appliances** | The device's own store | Device admins |
| **Our internal CA** | The CA server's key store (or an HSM) | CA admins only. **The most sensitive key we have.** |

On Windows, the key files physically sit under `C:\ProgramData\Microsoft\Crypto\` with ACLs. You never need to touch them directly; manage them through the certificate.

## Exportable vs non-exportable

When a key is created on Windows it's either **exportable** (can be saved out as a `.pfx`) or **non-exportable** (can be used, but never copied out through normal tools).

- Certificates from our CA's templates should be **non-exportable by default**. The template setting is *Allow private key to be exported*, and it should be **off** unless there's a documented reason.
- Keys can also be stored in the server's **TPM** (Microsoft Platform Crypto Provider), so they physically can't be copied off the machine.
- Non-exportable isn't perfect (an attacker with admin rights and the right tools can still extract keys from software storage), but it **stops accidental and casual copying**, which is the most common way keys spread.

## Why not to export keys

A `.pfx` file is the **certificate plus the private key**. Exporting one creates a copy of the server's identity that can travel anywhere.

| What happens to exported keys | Why it's a problem |
|---|---|
| Saved to a file share "for next time" | Everyone with share access can impersonate the server |
| Emailed to a vendor or colleague | Now in mailboxes, backups and the vendor's systems, forever |
| Attached to a ticket | Readable by everyone with ticket access |
| Committed to git or put in a script | Copied to every clone and backup |
| Installed on several servers "to save time" | One compromised server leaks the key for all of them |
| Left in `Downloads` after an install | Forgotten, and swept up in profile backups |

Once a key has been copied, **we can no longer say where it is**, which is exactly what ISM-0507 asks us to know. If any of those copies leaks, the only fix is to **revoke the certificate and issue a new one with a new key**.

## Do this instead

1. **Generate the key on the server that will use it.** Use `certlm.msc` → *Request New Certificate* / *Create Custom Request*, `certreq`, IIS *Create Certificate Request*, or `keytool -genkeypair`. The private key never moves; only the CSR (public) and the signed cert (public) travel.
2. **Moving or rebuilding a server? Issue a new certificate** for the new server instead of exporting the old one.
3. **One certificate per service.** Avoid the same cert and key on many servers, and especially avoid one wildcard copied everywhere.
4. **Lock down access.** Only the service account and admins should be able to read the key, the keystore file, or `server.xml` with the keystore password.
5. **Keep a record** of every certificate: what it's for, where it's installed, who owns it, and when it expires. That record is how we answer ISM-0507.
6. **When a cert is replaced, delete the old one** from the store and remove old keystore files.

### When export is genuinely needed

Some cases really do need the same key in more than one place, such as a load-balanced web farm or importing a cert into an appliance that can't generate its own CSR. In those cases:

- Agree it with the PKI owner first, and use a template that allows export **for that purpose only**.
- Protect the `.pfx` with a **strong, unique password** and send the password by a **different channel** from the file.
- Transfer it directly to the target (not via email, shares or tickets), import it, and **delete every intermediate copy**.
- Record where it's installed.

## If you think a key has leaked

Treat it like a leaked password:

1. Tell the PKI owner / security team straight away.
2. **Issue a new certificate with a new key** and install it.
3. **Revoke** the old certificate so clients stop trusting it.
4. Find and delete the copies you know about.

Patching or "changing the pfx password" doesn't help. Whoever has the copy already has the key.
