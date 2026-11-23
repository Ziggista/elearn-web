---
title: Presenter guide
description: Timing, demos and talking points for running the PKI and TLS session.
---


How to run the session from [the training page](/pki-tls/). Target is 45 minutes; trim or stretch using the notes below to land anywhere from 30 to 60.

## Before the session

- Fill in the `[bracketed]` placeholders in the training page: internal CA name, cert request process, TLS-settings standard, whether firewalls do TLS inspection, monitoring location, contacts.
- Pick one real internal site and one public site to demo. Have a browser and a PowerShell window ready on a server you can safely show.
- Optional: find one real (sanitised) cert error from a recent ticket. A local example lands far better than a generic one.

## Running order and timing

| Time | Section | Notes |
|---|---|---|
| 0:00–0:04 | Why this matters | Open with a recent real outage or ticket if you have one. Ask: "Who's had a cert expire on them?" |
| 0:04–0:14 | Part 1: crypto building blocks | The padlock analogy does most of the work. Don't go into maths. Land the line "the private key is the crown jewel". |
| 0:14–0:24 | Part 2: certificates and PKI | **Live demo:** open a site, click the padlock, show the SAN, dates and certification path. Then do the same for an internal site and point out the different issuer. |
| 0:24–0:33 | Part 3: TLS | Walk the handshake slowly. The key insight is "public-key crypto is only used at the start". Spend time on the four checks table; everything after builds on it. |
| 0:33–0:43 | Part 4: our environment | Go through the errors table and ask people which ones they've seen. The "habits to avoid" list is where to be firm. |
| 0:43–0:45 | Lifecycle, recap | Show the PowerShell expiry check live. Read the five recap points. |
| 0:45+ | Questions / quiz | Use [the quiz](/pki-tls/quiz/) if there's time or as a follow-up. |

**To cut to 30 minutes:** skip 1.4 (hashes) and 3.4 (versions), and only cover the first three rows of the errors table.

**To stretch to 60 minutes:** do the quiz live, and run `openssl s_client` against a site with a missing intermediate (or show a test one) so people see what "chain not sent" looks like in practice.

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
