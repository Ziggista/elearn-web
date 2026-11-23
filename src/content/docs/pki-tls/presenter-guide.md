---
title: Presenter guide
description: Timing, demos and talking points for running the PKI and TLS session.
---


How to run the Corp Apps PKI session. Target is about 40 minutes plus questions; trim or stretch using the notes below.

## Before the session

- Fill in the `[bracketed]` placeholders in the training page: internal CA name, cert request process, TLS-settings standard, whether firewalls do TLS inspection, monitoring location, contacts.
- Pick one real internal site and one public site to demo. Have a browser and a PowerShell window ready on a server you can safely show.
- Optional: find one real (sanitised) cert error from a recent ticket. A local example lands far better than a generic one.

## Running order and timing

The session deck is [Seb, Clint and the padlock](/present/tls-trust/) (42 slides, about 40 minutes; the memes go quickly). The [session notes](/pki-tls/tls-trust/) mirror it section by section.

| Time | Slides | Section | Notes |
|---|---|---|---|
| 0:00–0:03 | 1–4 | Objectives and why it matters | Read the six objectives. Then the Advanced → Proceed warning: a real attack and a misconfigured server look identical. |
| 0:03–0:13 | 5–17 | How trust works | The Seb and Clint story: postcard problem, Cash the CA, the handshake, four checks, paint mixing, Hank's tricks, middlemen. Don't rush slide 14 (four checks). |
| 0:13–0:18 | 18–21 | What goes in Seb's ID | CN vs SAN, the internal server cert checklist, server vs client use (EKU). **Live demo:** open an internal site's cert and show the SAN and EKU. |
| 0:18–0:30 | 22–35 | Seb in real life | Who plays who, requesting a SAN cert (certlm / certreq), AD CS, binding on IIS / SQL / RDP, Tomcat and keytool, where keys live, why not to export, ISM-0507. Use the local crib sheet here. |
| 0:30–0:38 | 36–40 | History and the long game | SSL to TLS 1.3, save now / decrypt later, Heartbleed, what's coming, what we do. |
| 0:38–0:40 | 41–42 | Recap and questions | Go back to the objectives: can everyone explain each one? |

**To cut to 30 minutes:** skip the paint slide (15), the history timeline (36) and the keytool code (30), and point people at the notes for them.

**To stretch to 45+ minutes:** do the [quiz](/pki-tls/quiz/) live, or walk through a real `certreq` request on a test server.

## Talking points by section

**Why this matters.** The point isn't to make everyone a PKI expert. It's that cert problems are predictable, and once you know the four checks you can fix most of them yourself instead of escalating.

**Symmetric vs asymmetric.** Symmetric is a safe with a combination: fast, but how do you share the combination? Asymmetric is handing out open padlocks: anyone can lock, only you can unlock. TLS uses both, which you'll come back to in Part 3.

**Signing.** Signing is the job that makes certificates work. A CA signing a cert is the CA saying "I checked, this key belongs to this name."

**SAN vs CN.** Expect someone to say "but the CN is right". Browsers stopped looking at CN years ago. Only the SAN list counts.

**The chain.** "It works in Chrome" is the trap. Browsers quietly fetch missing intermediates; Java, PHP and curl don't. Always serve the full chain.

**Public vs internal.** Anyone who isn't on a domain-joined machine won't trust the internal CA: phones, vendors, SaaS, Linux boxes, Java apps. That's the deciding question.

**Handshake.** Don't drill into message names. The story is: say hello, prove identity with the cert, agree a secret key without sending it, then encrypt everything fast.

**TrustServerCertificate.** This one deserves a moment. It's in a lot of vendor install guides and connection strings. Explain that it keeps encryption but throws away authentication, so it's like locking your car and leaving the key in the door.

**Shrinking lifetimes.** This is the "why should I care now" point. At 47 days, nobody can renew certs by hand across our estate. Automation and an accurate inventory are the only way through.

## Likely questions

**"Is a self-signed cert encrypted?"** Yes, the traffic is encrypted. But nothing proves who you're talking to, so an attacker can swap in their own self-signed cert and the client can't tell the difference.

**"Why can't we just use one wildcard for everything?"** You can technically, but every server holding it holds the same private key. One compromised box means reissuing everywhere, and you lose track of where it's installed.

**"Do I need to restart IIS after changing a cert?"** Changing the binding takes effect without a full restart. SQL Server does need a service restart to pick up a new cert.

**"What's the difference between SSL and TLS?"** SSL is the old, broken predecessor. Everything today is TLS; "SSL certificate" is just the name that stuck.

**"What happens when a cert expires?"** Nothing changes on the server. Clients just start refusing to connect, all at once, at the expiry time.

**"Can we see the private key in the cert?"** No. The certificate only contains the public key. The private key is stored separately, which is why a .pfx (which bundles both) has to be treated as a secret.
