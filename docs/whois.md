# WHOIS Lookup - Comprehensive Technical Documentation

This document describes the WHOIS lookup functionality implemented in MailForge, covering supported TLDs, second-level domain structures, parsing rules, and technical implementation details.

## Table of Contents

1. [Overview](#overview)
2. [Supported TLDs](#supported-tlds)
3. [Compound Second-Level Domains](#compound-second-level-domains)
4. [WHOIS Parsing Rules](#whois-parsing-rules)
5. [RDAP Support](#rdap-support)
6. [Dynamic Discovery](#dynamic-discovery)
7. [Technical Implementation](#technical-implementation)
8. [Error Handling](#error-handling)
9. [Testing](#testing)
10. [Roadmap](#roadmap)

---

## Overview

MailForge's WHOIS lookup supports **765+ TLDs** through a combination of:
- **Static WHOIS server maps** for known TLDs
- **Static RDAP server maps** for modern TLDs
- **Dynamic IANA discovery** for unknown TLDs
- **Compound SLD parsing** for hierarchical domain structures

### Supported Domain Types

| Category | Count | Examples |
|----------|-------|----------|
| Generic TLDs (gTLDs) | 15 | .com, .net, .org, .info, .biz |
| Country-code TLDs (ccTLDs) | 120+ | .uk, .de, .fr, .jp, .kr |
| Compound Second-Level Domains | 200+ | .com.tr, .co.uk, .co.jp |
| New gTLDs | 350+ | .online, .site, .cloud |
| Brand TLDs | 30+ | .google, .apple, .amazon |
| RDAP-enabled TLDs | 50+ | .dev, .app, .io |
| **Total** | **765+** | |

---

## Supported TLDs

### Generic Top-Level Domains (gTLDs)

| TLD | WHOIS Server | Registry |
|-----|-------------|----------|
| com | whois.verisign-grs.com | VeriSign |
| net | whois.verisign-grs.com | VeriSign |
| org | whois.pir.org | Public Interest Registry |
| info | whois.afilias.net | Afilias |
| biz | whois.biz | Neustar |
| name | whois.nic.name | VeriSign |
| pro | whois.nic.pro | Registry Services |
| mobi | whois.afilias.net | Afilias |
| asia | whois.nic.asia | DotAsia |
| tel | whois.nic.tel | Telnic |
| coop | whois.nic.coop |ml | whois.nic.coop |
| aero | whois.nic.aero | SITA |
| cat | whois.nic.cat | Fundació puntCAT |
| jobs | whois.nic.jobs | Employ Media |
| museum | whois.museum | Museum Domain Registry |

### Google TLDs (Operated by Google)

| TLD | WHOIS Server | RDAP Server |
|-----|-------------|-------------|
| dev | whois.nic.google | https://pubapi.registry.google/rdap |
| app | whois.nic.google | https://pubapi.registry.google/rdap |
| chrome | whois.nic.google | https://pubapi.registry.google/rdap |
| android | whois.nic.google | https://pubapi.registry.google/rdap |
| ads | whois.nic.google | https://pubapi.registry.google/rdap |
| play | whois.nic.google | https://pubapi.registry.google/rdap |
| search | whois.nic.google | https://pubapi.registry.google/rdap |
| how | whois.nic.google | https://pubapi.registry.google/rdap |
| page | whois.nic.google | https://pubapi.registry.google/rdap |
| php | whois.nic.google | https://pubapi.registry.google/rdap |
| plus | whois.nic.google | https://pubapi.registry.google/rdap |
| voyage | whois.nic.google | https://pubapi.registry.google/rdap |
| moto | whois.nic.google | https://pubapi.registry.google/rdap |
| here | whois.nic.google | https://pubapi.registry.google/rdap |
| new | whois.nic.google | https://pubapi.registry.google/rdap |
| foo | whois.nic.google | https://pubapi.registry.google/rdap |
| hangout | whois.nic.google | https://pubapi.registry.google/rdap |
| mov | whois.nic.google | https://pubapi.registry.google/rdap |
| now | whois.nic.google | https://pubapi.registry.google/rdap |
| tab | whois.nic.google | https://pubapi.registry.google/rdap |

### Country-Code TLDs (ccTLDs) - Europe

| TLD | Country | WHOIS Server |
|-----|---------|-------------|
| uk | United Kingdom | whois.nic.uk |
| de | Germany | whois.denic.de |
| fr | France | whois.nic.fr |
| nl | Netherlands | whois.sidn.nl |
| eu | European Union | whois.eu |
| it | Italy | whois.nic.it |
| es | Spain | whois.nic.es |
| pt | Portugal | whois.dns.pt |
| pl | Poland | whois.dns.pl |
| cz | Czech Republic | whois.nic.cz |
| se | Sweden | whois.iis.se |
| no | Norway | whois.norid.no |
| fi | Finland | whois.fi |
| dk | Denmark | whois.dk-hostmaster.dk |
| at | Austria | whois.nic.at |
| ch | Switzerland | whois.nic.ch |
| be | Belgium | whois.dns.be |
| ie | Ireland | whois.iedr.ie |
| ro | Romania | whois.rotld.ro |
| hu | Hungary | whois.nic.hu |
| gr | Greece | whois.gr |
| bg | Bulgaria | whois.register.bg |
| hr | Croatia | whois.dns.hr |
| si | Slovenia | whois.arnes.si |
| sk | Slovakia | whois.sk-nic.sk |
| lt | Lithuania | whois.domreg.lt |
| lv | Latvia | whois.nic.lv |
| ee | Estonia | whois.tld.ee |
| rs | Serbia | whois.rnids.rs |
| ba | Bosnia and Herzegovina | whois.nic.ba |
| me | Montenegro | whois.nic.me |
| mk | North Macedonia | whois.marnet.mk |
| al | Albania | whois.akdn.al |
| cy | Cyprus | whois.nic.cy |
| mt | Malta | whois.nic.org.mt |
| lu | Luxembourg | whois.dns.lu |
| is | Iceland | whois.isnic.is |
| li | Liechtenstein | whois.nic.li |
| ad | Andorra | whois.nic.ad |
| mc | Monaco | whois.nic.mc |
| sm | San Marino | whois.nic.sm |
| va | Vatican City | whois.nic.va |
| ua | Ukraine | whois.ua |
| by | Belarus | whois.tld.by |

### Country-Code TLDs (ccTLDs) - Asia & Oceania

| TLD | Country | WHOIS Server |
|-----|---------|-------------|
| jp | Japan | whois.jprs.jp |
| kr | South Korea | whois.kr |
| cn | China | whois.cnnic.cn |
| hk | Hong Kong | whois.hkirc.hk |
| tw | Taiwan | whois.twnic.net.tw |
| sg | Singapore | whois.sgnic.sg |
| in | India | whois.inregistry.net |
| th | Thailand | whois.thnic.co.th |
| ph | Philippines | whois.dot.ph |
| id | Indonesia | whois.id |
| my | Malaysia | whois.mynic.my |
| pk | Pakistan | whois.pknic.net.pk |
| bd | Bangladesh | whois.btcl.com.bd |
| lk | Sri Lanka | whois.nic.lk |
| np | Nepal | whois.nic.np |
| bt | Bhutan | whois.nic.bt |
| au | Australia | whois.auda.org.au |
| nz | New Zealand | whois.srs.net.nz |
| fj | Fiji | whois.fiji.domains |
| pg | Papua New Guinea | whois.nic.org.pg |
| mo | Macau | whois.monic.mo |

### Country-Code TLDs (ccTLDs) - Americas

| TLD | Country | WHOIS Server |
|-----|---------|-------------|
| us | United States | whois.nic.us |
| ca | Canada | whois.cira.ca |
| br | Brazil | whois.registro.br |
| mx | Mexico | whois.nic.mx |
| ar | Argentina | whois.nic.ar |
| cl | Chile | whois.nic.cl |
| ve | Venezuela | whois.nic.ve |
| pe | Peru | whois.nic.pe |
| ec | Ecuador | whois.nic.ec |
| cr | Costa Rica | whois.nic.cr |
| pa | Panama | whois.nic.pa |
| pr | Puerto Rico | whois.nic.pr |
| do | Dominican Republic | whois.nic.do |
| cu | Cuba | whois.nic.cu |
| gt | Guatemala | whois.nic.gt |
| hn | Honduras | whois.nic.hn |
| sv | El Salvador | whois.nic.sv |
| ni | Nicaragua | whois.nic.ni |
| bo | Bolivia | whois.nic.bo |
| py | Paraguay | whois.nic.py |
| uy | Uruguay | whois.nic.uy |

### Country-Code TLDs (ccTLDs) - Small Territories

| TLD | Territory | WHOIS Server |
|-----|-----------|-------------|
| io | British Indian Ocean Territory | whois.nic.io |
| ai | Anguilla | whois.nic.ai |
| cc | Cocos (Keeling) Islands | ccwhois.verisign-grs.com |
| sh | Saint Helena | whois.nic.sh |
| ac | Ascension Island | whois.nic.ac |
| im | Isle of Man | whois.nic.im |
| je | Jersey | whois.je |
| gg | Guernsey | whois.gg |
| fo | Faroe Islands | whois.nic.fo |
| gl | Greenland | whois.nic.gl |
| pm | Saint Pierre and Miquelon | whois.nic.pm |
| tf | French Southern Territories | whois.nic.tf |
| wf | Wallis and Futuna | whois.nic.wf |
| yt | Mayotte | whois.nic.yt |
| re | Réunion | whois.nic.re |
| tk | Tokelau | whois.nic.tk |
| pw | Palau | whois.nic.pw |
| vg | British Virgin Islands | whois.adamsnames.vg |
| tc | Turks and Caicos Islands | whois.nic.tc |
| sc | Seychelles | whois.nic.sc |
| bz | Belize | whois.belizenic.bz |
| dm | Dominica | whois.nic.dm |
| ag | Antigua and Barbuda | whois.nic.ag |
| bm | Bermuda | whois.nic.bm |
| ky | Cayman Islands | whois.nic.ky |
| ms | Montserrat | whois.nic.ms |
| kn | Saint Kitts and Nevis | whois.nic.kn |
| lc | Saint Lucia | whois.nic.lc |
| vc | Saint Vincent and the Grenadines | whois.nic.vc |
| bb | Barbados | whois.nic.bb |
| tt | Trinidad and Tobago | whois.nic.tt |
| gs | South Georgia and the South Sandwich Islands | whois.nic.gs |
| kp | North Korea | whois.kptc.kp |
| mn | Mongolia | whois.nic.mn |
| gi | Gibraltar | whois.afilias-srs.net |
| cx | Christmas Island | whois.nic.cx |
| nu | Niue | whois.nic.nu |

### Country-Code TLDs (ccTLDs) - Africa

| TLD | Country | WHOIS Server |
|-----|---------|-------------|
| za | South Africa | whois.registry.net.za |
| africa | Africa | whois.nic.za |
| gh | Ghana | whois.nic.gh |
| ghana | Ghana | whois.nic.ghana |
| ug | Uganda | whois.nic.ug |
| tz | Tanzania | whois.tznic.or.tz |
| rw | Rwanda | whois.ricta.org.rw |
| mz | Mozambique | whois.nic.mz |
| zm | Zambia | whois.zicta.zm |
| bw | Botswana | whois.nic.bw |
| ng | Nigeria | whois.nic.net.ng |
| ke | Kenya | whois.kenic.or.ke |

### Country-Code TLDs (ccTLDs) - Middle East

| TLD | Country | WHOIS Server |
|-----|---------|-------------|
| il | Israel | whois.isoc.org.il |
| ir | Iran | whois.nic.ir |
| sa | Saudi Arabia | whois.nic.net.sa |
| ae | United Arab Emirates | whois.nic.ae |
| qa | Qatar | whois.nic.qa |
| kw | Kuwait | whois.nic.kw |
| lb | Lebanon | whois.lbdr.org.lb |
| jo | Jordan | whois.nic.jo |
| om | Oman | whois.registry.om |
| bh | Bahrain | whois.nic.bh |
| eg | Egypt | whois.registrar.eg |
| dz | Algeria | whois.nic.dz |
| tn | Tunisia | whois.ati.tn |
| ma | Morocco | whois.registrar.ma |

### Country-Code TLDs (ccTLDs) - Pacific Islands

| TLD | Country | WHOIS Server |
|-----|---------|-------------|
| ws | Samoa | whois.nic.ws |
| sb | Solomon Islands | whois.nic.sb |
| to | Tonga | whois.tonic.to |
| vu | Vanuatu | whois.nic.vu |
| ki | Kiribati | whois.nic.ki |
| nr | Nauru | whois.nic.nr |
| gu | Guam | whois.nic.gu |
| mp | Northern Mariana Islands | whois.nic.mp |
| tl | Timor-Leste | whois.nic.tl |
| pf | French Polynesia | whois.registry.pf |

---

## Compound Second-Level Domains

Many countries have hierarchical domain structures where the second-level domain (SLD) indicates the type of registrant or purpose. Below is a comprehensive list organized by country.

### 🇹🇷 Turkey (.tr) - 18+ SLDs

The Turkish domain registry (TRABIS) supports the following second-level domains:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| com.tr | Commercial | Commercial entities |
| net.tr | Network | Network/ISP organizations |
| org.tr | Organization | Non-commercial organizations |
| web.tr | Web | Web-based services |
| gen.tr | General | General use |
| edu.tr | Education | Educational institutions |
| gov.tr | Government | Government agencies |
| mil.tr | Military | Military institutions |
| bel.tr | Municipal | Municipalities |
| k12.tr | K-12 Education | Primary and secondary schools |
| info.tr | Information | Information services |
| bir.tr | Personal | Personal use |
| cop.tr | Professional | Cooperatives |
| dr.tr | Doctor | Medical doctors |
| pol.tr | Police | Law enforcement |
| tsk.tr | Turkish Armed Forces | Military |
| nc.tr | Northern Cyprus | Northern Cyprus entities |
| gov.nc.tr | Northern Cyprus Government | NC government agencies |

**WHOIS Server:** `whois.trabis.gov.tr`

**Parsing Notes:**
- Field names use dot-padding: `Created on..............: 2007-Jan-08.`
- Date values end with trailing period
- Date format: `YYYY-Mon-DD` (e.g., `2007-Jan-08`)

---

### 🇬🇧 United Kingdom (.uk) - 13+ SLDs

Nominet (UK's domain registry) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| co.uk | Commercial | Commercial organizations |
| org.uk | Organization | Non-commercial organizations |
| net.uk | Network | Network infrastructure |
| me.uk | Personal | Personal use |
| ltd.uk | Limited Company | UK limited companies |
| plc.uk | Public Limited Company | UK PLCs |
| sch.uk | School | Schools |
| ac.uk | Academic | Universities and research |
| gov.uk | Government | UK government |
| mod.uk | Ministry of Defence | UK MOD |
| nhs.uk | National Health Service | NHS organizations |
| police.uk | Police | Police forces |
| jet.uk | JET | Research institutions |

**WHOIS Server:** `whois.nic.uk`

---

### 🇧🇷 Brazil (.br) - 70+ SLDs

NIC.br (Brazilian domain registry) supports extensive second-level domains:

| SLD | Description | SLD | Description |
|-----|-------------|-----|-------------|
| com.br | Commercial | net.br | Network |
| org.br | Organization | edu.br | Education |
| gov.br | Government | mil.br | Military |
| adv.br | Advocate | agr.br | Agriculture |
| am.br | Amateur | art.br | Artistic |
| atm.br | ATM | bio.br | Biotechnology |
| blog.br | Blog | bmd.br | BMD |
| cim.br | Real Estate | cng.br | News Agency |
| cnt.br | Content | coop.br | Cooperative |
| ecn.br | Economics | eng.br | Engineering |
| esp.br | Sports | etc.br | Miscellaneous |
| eti.br | Information Technology | far.br | Pharmacy |
| flog.br | Photo Log | fm.br | FM Radio |
| fnd.br | Foundation | fot.br | Photography |
| fst.br | Science | g12.br | K-12 Schools |
| geo.br | Geographic | ggr.br | Engineering |
| gro.br | Grooming | guj.br | Journalism |
| hosp.br | Hospitality | imb.br | Advertising |
| ind.br | Industry | inf.br | Information |
| jor.br | Journalism | jus.br | Legal |
| leg.br | Legislative | lel.br | Literary |
| mat.br | Mathematics | med.br | Medical |
| mus.br | Music | nom.br | Nominal |
| ntr.br | Notary | odo.br | Dental |
| ong.br | NGO | ppg.br | Press |
| pro.br | Professional | psc.br | Scientific |
| psi.br | PSI | qsl.br | Radio |
| rec.br | Recreation | slg.br | Slang |
| tmp.br | Temporary | tur.br | Tourism |
| tv.br | Television | vet.br | Veterinary |
| vix.br | VX | wleg.br | Web Legal |
| xml.br | XML | | |

**WHOIS Server:** `whois.registro.br`

---

### 🇯🇵 Japan (.jp) - 15+ SLDs

JPRS (Japan Registry Services) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| co.jp | Commercial | Commercial companies |
| or.jp | Organization | Non-profit organizations |
| ne.jp | Network | Network services |
| go.jp | Government | Government agencies |
| ad.jp | Administrative | Administrative entities |
| ac.jp | Academic | Universities, colleges |
| gr.jp | Personal | Grown personal domains |
| lg.jp | Local Government | Municipalities |
| geo.jp | Geographic | Geographic-related |
| kids.jp | Kids | Children's resources |
| ed.jp | Education | Education-related |
| foo.jp | Foo | General use |
| game.jp | Game | Gaming-related |
| ernet.jp | ERNET | ERNET Japan |
| priv.jp | Private | Private individuals |

**WHOIS Server:** `whois.jprs.jp`

---

### 🇰🇷 South Korea (.kr) - 27+ SLDs

KISA (Korea Internet & Security Agency) supports:

| SLD | Description | SLD | Description |
|-----|-------------|-----|-------------|
| co.kr | Commercial | or.kr | Organization |
| ne.kr | Network | re.kr | Research |
| pe.kr | Publishing | go.kr | Government |
| mil.kr | Military | ac.kr | Academic |
| hs.kr | Elementary School | ms.kr | Middle School |
| es.kr | High School | seoul.kr | Seoul |
| busan.kr | Busan | daegu.kr | Daegu |
| incheon.kr | Incheon | gwangju.kr | Gwangju |
| daejeon.kr | Daejeon | ulsan.kr | Ulsan |
| gyeonggi.kr | Gyeonggi | gangwon.kr | Gangwon |
| chungbuk.kr | North Chungcheong | chungnam.kr | South Chungcheong |
| jeonbuk.kr | North Jeolla | jeonnam.kr | South Jeolla |
| gyeongbuk.kr | North Gyeongsang | gyeongnam.kr | South Gyeongsang |
| jeju.kr | Jeju | | |

**WHOIS Server:** `whois.kr`

---

### 🇨🇳 China (.cn) - 12+ SLDs

CNNIC (China Internet Network Information Center) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| com.cn | Commercial | Commercial entities |
| net.cn | Network | Network services |
| org.cn | Organization | Non-profit organizations |
| gov.cn | Government | Government agencies |
| ac.cn | Academic | Academic institutions |
| edu.cn | Education | Educational institutions |
| mil.cn | Military | Military organizations |
| id.cn | Identity | Identity-related |
| bj.cn | Beijing | Beijing entities |
| sh.cn | Shanghai | Shanghai entities |
| gz.cn | Guangzhou | Guangzhou entities |
| sz.cn | Shenzhen | Shenzhen entities |

**WHOIS Server:** `whois.cnnic.cn`

---

### 🇦🇺 Australia (.au) - 13+ SLDs

auDA (Australian Domain Administration) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| com.au | Commercial | Commercial entities |
| net.au | Network | Network services |
| org.au | Organization | Non-commercial organizations |
| edu.au | Education | Educational institutions |
| gov.au | Government | Australian government |
| csiro.au | CSIRO | Scientific organizations |
| id.au | Identity | Identity services |
| biz.au | Business | Business entities |
| info.au | Information | Information services |
| name.au | Personal | Personal use |
| asn.au | Association | Industry associations |
| otd.au | Peak Bodies | Trade/organizations |
| ip.au | IP Address | IP address holders |

**WHOIS Server:** `whois.auda.org.au`

---

### 🇳🇿 New Zealand (.nz) - 10+ SLDs

NZRS (New Zealand Domain Name Commission) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| co.nz | Commercial | Commercial entities |
| net.nz | Network | Network services |
| org.nz | Organization | Non-profit organizations |
| maori.nz | Maori | Maori community |
| govt.nz | Government | New Zealand government |
| ac.nz | Academic | Educational institutions |
| school.nz | School | Primary/secondary schools |
| geek.nz | Geek | Technology enthusiasts |
| kiwi.nz | Kiwi | New Zealand community |
| iwi.nz | Iwi | Maori tribal entities |

**WHOIS Server:** `whois.srs.net.nz`

---

### 🇮🇳 India (.in) - 11+ SLDs

INRegistry (National Internet Registry of India) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| co.in | Commercial | Commercial entities |
| net.in | Network | Network services |
| org.in | Organization | Non-profit organizations |
| gen.in | General | General use |
| ind.in | Individual | Personal use |
| firm.in | Firm | Business firms |
| ac.in | Academic | Academic institutions |
| edu.in | Education | Educational institutions |
| res.in | Research | Research organizations |
| gov.in | Government | Indian government |
| mil.in | Military | Indian military |

**WHOIS Server:** `whois.inregistry.net`

---

### 🇨🇴 Colombia (.co) - 6+ SLDs

.CO Internet (Colombian domain registry) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| com.co | Commercial | Commercial entities |
| net.co | Network | Network services |
| nom.co | Nominee | Nominee registrations |
| org.co | Organization | Non-profit organizations |
| edu.co | Education | Educational institutions |
| gov.co | Government | Colombian government |

**WHOIS Server:** `whois.nic.co`

---

### 🇲🇽 Mexico (.mx) - 6+ SLDs

NIC-Mexico supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| com.mx | Commercial | Commercial entities |
| net.mx | Network | Network services |
| org.mx | Organization | Non-profit organizations |
| edu.mx | Education | Educational institutions |
| gob.mx | Government | Mexican government |
| mil.mx | Military | Mexican military |

**WHOIS Server:** `whois.nic.mx`

---

### 🇸🇬 Singapore (.sg) - 6+ SLDs

SGNIC (Singapore Network Information Centre) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| com.sg | Commercial | Commercial entities |
| net.sg | Network | Network services |
| org.sg | Organization | Non-profit organizations |
| edu.sg | Education | Educational institutions |
| gov.sg | Government | Singapore government |
| per.sg | Personal | Personal use |

**WHOIS Server:** `whois.sgnic.sg`

---

### 🇭🇰 Hong Kong (.hk) - 8+ SLDs

HKIRC (Hong Kong Internet Registration Corporation) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| com.hk | Commercial | Commercial entities |
| net.hk | Network | Network services |
| org.hk | Organization | Non-profit organizations |
| edu.hk | Education | Educational institutions |
| gov.hk | Government | Hong Kong government |
| idv.hk | Individual | Personal use |
| company.hk | Company | Hong Kong companies |
| we.hk | Web | Web services |

**WHOIS Server:** `whois.hkirc.hk`

---

### 🇹🇼 Taiwan (.tw) - 10+ SLDs

TWNIC (Taiwan Network Information Center) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| com.tw | Commercial | Commercial entities |
| net.tw | Network | Network services |
| org.tw | Organization | Non-profit organizations |
| idv.tw | Individual | Personal use |
| gov.tw | Government | Taiwanese government |
| edu.tw | Education | Educational institutions |
| mil.tw | Military | Military institutions |
| game.tw | Game | Gaming-related |
| ebiz.tw | E-Business | E-commerce |
| club.tw | Club | Clubs and organizations |

**WHOIS Server:** `whois.twnic.net.tw`

---

### 🇦🇷 Argentina (.ar) - 10+ SLDs

NIC Argentina supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| com.ar | Commercial | Commercial entities |
| net.ar | Network | Network services |
| org.ar | Organization | Non-profit organizations |
| gob.ar | Government | Argentine government |
| gov.ar | Government | Government (alt) |
| int.ar | International | International organizations |
| mil.ar | Military | Military institutions |
| edu.ar | Education | Educational institutions |
| tur.ar | Tourism | Tourism sector |
| coop.ar | Cooperative | Cooperatives |

**WHOIS Server:** `whois.nic.ar`

---

### 🇨🇱 Chile (.cl) - 8+ SLDs

NIC Chile supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| com.cl | Commercial | Commercial entities |
| net.cl | Network | Network services |
| org.cl | Organization | Non-profit organizations |
| gob.cl | Government | Chilean government |
| gov.cl | Government | Government (alt) |
| mil.cl | Military | Military institutions |
| educ.cl | Education | Educational institutions |
| proj.cl | Project | Project domains |

**WHOIS Server:** `whois.nic.cl`

---

### 🇻🇪 Venezuela (.ve) - 10+ SLDs

CNV (Comisión Nacional de Telecomunicaciones) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| com.ve | Commercial | Commercial entities |
| net.ve | Network | Network services |
| org.ve | Organization | Non-profit organizations |
| co.ve | Company | Companies |
| info.ve | Information | Information services |
| web.ve | Web | Web services |
| gob.ve | Government | Venezuelan government |
| gov.ve | Government | Government (alt) |
| edu.ve | Education | Educational institutions |

**WHOIS Server:** `whois.nic.ve`

---

### 🇵🇪 Peru (.pe) - 6+ SLDs

REDIP Peru supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| com.pe | Commercial | Commercial entities |
| net.pe | Network | Network services |
| org.pe | Organization | Non-profit organizations |
| gob.pe | Government | Peruvian government |
| edu.pe | Education | Educational institutions |
| nom.pe | Nominal | Nominee registrations |

**WHOIS Server:** `whois.nic.pe`

---

### 🇹🇭 Thailand (.th) - 8+ SLDs

THNIC (Thailand Network Information Center) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| co.th | Commercial | Commercial entities |
| ac.th | Academic | Academic institutions |
| go.th | Government | Thai government |
| in.th | Individual | Personal use |
| mi.th | Ministry | Government ministries |
| net.th | Network | Network services |
| or.th | Organization | Non-profit organizations |

**WHOIS Server:** `whois.thnic.co.th`

---

### 🇮🇩 Indonesia (.id) - 10+ SLDs

PANDI (Pengelola Nama Domain Internet Indonesia) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| co.id | Commercial | Commercial entities |
| net.id | Network | Network services |
| org.id | Organization | Non-profit organizations |
| ac.id | Academic | Academic institutions |
| go.id | Government | Indonesian government |
| sch.id | School | Schools |
| web.id | Web | Web services |
| mil.id | Military | Indonesian military |
| biz.id | Business | Business entities |
| my.id | Personal | Personal use |

**WHOIS Server:** `whois.id`

---

### 🇿🇦 South Africa (.za) - 6+ SLDs

 ZACR (South African Domain Name Authority) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| co.za | Commercial | Commercial entities |
| net.za | Network | Network services |
| org.za | Organization | Non-profit organizations |
| web.za | Web | Web services |
| gov.za | Government | South African government |
| school.za | School | Schools |

**WHOIS Server:** `whois.registry.net.za`

---

### 🇩🇪 Germany (.de) - Direct Registration

Germany (.de) primarily uses direct second-level registration without subdomains, but supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| de | Germany | Direct registration (no SLD) |
| com.de | Commercial | Commercial entities |
| net.de | Network | Network services |
| org.de | Organization | Non-profit organizations |
| hamburg.de | Hamburg | Hamburg entities |
| berlin.de | Berlin | Berlin entities |

**WHOIS Server:** `whois.denic.de`

---

### 🇫🇷 France (.fr) - 7+ SLDs

AFNIC (French Network Information Centre) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| fr | France | Direct registration |
| com.fr | Commercial | Commercial entities |
| org.fr | Organization | Non-profit organizations |
| net.fr | Network | Network services |
| per.fr | Personal | Personal use |
| adm.fr | Administrative | Administrative |
| asso.fr | Association | Associations |
| gouv.fr | Government | French government |

**WHOIS Server:** `whois.nic.fr`

---

### 🇮🇹 Italy (.it) - 6+ SLDs

Registro .IT (Italian Network Information Centre) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| it | Italy | Direct registration |
| com.it | Commercial | Commercial entities |
| net.it | Network | Network services |
| org.it | Organization | Non-profit organizations |
| edu.it | Education | Educational institutions |
| gov.it | Government | Italian government |

**WHOIS Server:** `whois.nic.it`

---

### 🇷🇺 Russia (.ru) - 6+ SLDs

CC for Domain .RU (Russian domain registry) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| ru | Russia | Direct registration |
| com.ru | Commercial | Commercial entities |
| net.ru | Network | Network services |
| org.ru | Organization | Non-profit organizations |
| pp.ru | Personal | Personal use |
| ruc.ru | Russian | Russian commercial |
| edu.ru | Education | Educational institutions |
| ac.ru | Academic | Academic institutions |

**WHOIS Server:** `whois.tcinet.ru`

---

### 🇳🇱 Netherlands (.nl) - 5+ SLDs

SIDN (Netherlands Network Information Centre) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| nl | Netherlands | Direct registration |
| com.nl | Commercial | Commercial entities |
| net.nl | Network | Network services |
| org.nl | Organization | Non-profit organizations |
| co.nl | Company | Dutch companies |

**WHOIS Server:** `whois.sidn.nl`

---

### 🇪🇸 Spain (.es) - 5+ SLDs

ESNIC (Spanish Network Information Centre) supports:

| SLD | Description | Target Audience |
|-----|-------------|-----------------|
| es | Spain | Direct registration |
| com.es | Commercial | Commercial entities |
| org.es | Organization | Non-profit organizations |
| net.es | Network | Network services |
| gob.es | Government | Spanish government |
| edu.es | Education | Educational institutions |

**WHOIS Server:** `whois.nic.es`

---

## New gTLDs (Generic New Top-Level Domains)

The following new generic TLDs are supported:

### Brand TLDs

| TLD | Brand | WHOIS Server |
|-----|-------|-------------|
| apple | Apple | whois.afilias.net |
| amazon | Amazon | whois.nic.amazon |
| google | Google | whois.nic.google |
| microsoft | Microsoft | whois.nic.microsoft |
| intel | Intel | whois.intel.com |
| dell | Dell | whois.dell.com |
| cisco | Cisco | whois.cisco.com |
| oracle | Oracle | whois.oracle.com |
| adobe | Adobe | whois.adobe.com |
| ibm | IBM | whois.markmonitor.com |
| samsung | Samsung | whois.samsung.com |
| sony | Sony | whois.sonynic.com |
| toyota | Toyota | whois.toyota.com |
| bmw | BMW | whois.bmw.com |
| mercedes | Mercedes-Benz | whois.mercedes-benz.com |
| audi | Audi | whois.audi.com |
| fox | Fox | whois.fox.com |
| disney | Disney | whois.disney.com |
| hotels | Booking.com | whois.booking.com |
| travel | Travel.com | whois.travel.com |
| airbnb | Airbnb | whois.airbnb.com |
| uber | Uber | whois.uber.com |
| spotify | Spotify | whois.nic.spotify |
| netflix | Netflix | whois.nic.netflix |
| twitter | Twitter | whois.nic.twitter |

### Generic New gTLDs (350+ TLDs)

The following categories are supported with `whois.nic.{tld}` format:

**Business & Commerce:**
```
academy, agency, apartments, associates, attorney, auction, 
auto, autos, baby, band, bank, bar, beauty, beer, best, 
bible, bid, bike, bingo, black, blog, blue, book, boutique, 
broker, build, business, buy, buzz
```

**Services:**
```
cafe, camera, camp, capital, car, cards, care, career, careers, 
cash, casino, center, charity, chat, cheap, christmas, church, 
city, claims, cleaning, click, clinic, clothing, club, coach, 
codes, coffee, college, community, company, compare, computer, 
condos, construction, consulting, contact, contractors, cooking, 
cool, corsica, country, coupons, courses, coupon, credit, 
creditcard, cruises
```

**Technology & Digital:**
```
dance, dating, deals, degree, delivery, democrat, dental, dentist, 
desi, design, diamonds, diet, digital, direct, directory, discount, 
doctor, dog, domains, dot, download, drinks, drive, earth, education, 
energy, engineer, engineering, enterprises, equipment, estate, eus, 
events, exchange, expert, exposed, express
```

**Lifestyle & Personal:**
```
fail, faith, family, fan, fans, farm, fashion, feedback, film, finance, 
financial, fire, fish, fishing, fit, fitness, flights, florist, flowers, 
fly, foo, food, football, forex, forsale, forum, foundation, fun, 
fund, furniture, futbol, fyi
```

**Media & Entertainment:**
```
gallery, game, games, garden, gay, gdn, gent, gift, gifts, gives, 
giving, glass, global, gmbh, gold, golf, green, gripe, group, guide, 
guitars, guru, hair, hangout, haus, health, healthcare, help, here, 
hermes, hiphop, hiv, hockey, holdings, holiday, homes, horse, hospital, 
host, hosting, house, how, ice, icu, ifmy, immo, immobilien, inc, 
industries, ink, institute, insurance, insure, investments, irish, 
jewelry
```

**Location-Based:**
```
joburg, kaufen, kim, kitchen, kiwi, land, lat, latino, lawyer, lease, 
lgbt, life, lighting, like, link, live, llc, loan, loans, locker, 
london, love, ltd, ltda, luxury
```

**More Categories:**
```
madrid, maif, maison, makeup, management, map, market, marketing, markets, 
mba, media, meet, melbourne, memorial, men, menu, miami, mini, mls, 
mobile, moto, motorcycles, mov, movie, music, navy, network, new, news, 
next, ngo, ninja, now, nsw, nyc, observer, off, one, ong, onl, online, 
ooo, organic, origins, osaka, page, paris, partners, parts, party, pet, 
pharmacy, photo, photography, photos, physio, pics, pictures, pink, 
pizza, place, plumbing, plus, poker, politie, porn, post, press, 
productions, prof, promo, properties, property, protection, pub, qpon, 
quebec
```

**Sports & Recreation:**
```
racing, radio, read, realestate, realtor, reality, recipes, red, rehab, 
reisen, rent, rentals, repair, report, republican, rest, restaurant, 
review, reviews, rich, rio, rip, rocks, rodeo, roma, room, ruhr, run, 
ryukyu
```

**Shopping & Commerce:**
```
sale, salon, sandvik, sandvikcoromant, saarland, scholarships, school, 
schule, science, secure, security, seek, services, sex, sexy, shiksha, 
shoes, shop, shopping, show, shriram, singles, site, ski, skin, soccer, 
social, software, solar, solutions, soy, space, spa, spread, srl, storage, 
store, study, style, sucks, supplies, supply, support, surf, surgery, 
sydney, systems, tab, taipei, tatar, tattoo, tax, taxi, team, technology, 
tennis, theater, theatre, tickets, tienda, tips, tires, today, tokyo, 
tools, top, tour, town, toys, trade, trading, training, travelers, trust, 
tube, tushu, tv
```

**Miscellaneous:**
```
university, uno, vacations, vana, vegas, ventures, versicherung, vet, 
video, villas, vision, vlaanderen, vodka, vote, voting, voyage, wales, 
wang, watch, web, webcam, website, wedding, weibo, whois, wiki, win, 
wine, wme, work, works, world, wtf, xbox, yachts, yoga, youtube, 
zuerich, zx
```

---

## WHOIS Parsing Rules

### Standard WHOIS Field Parsing

The WHOIS parser handles multiple field formats:

```go
// Standard format
Domain Name: example.com
Registry Domain ID: D1234567-COM
Registrar WHOIS Server: whois.example.com
Registrar URL: https://www.example.com
Created Date: 2020-01-01T00:00:00Z
Updated Date: 2024-01-01T00:00:00Z
Expiration Date: 2025-01-01T00:00:00Z

// Key date fields (case-insensitive)
- Created Date / Creation Date / Created On
- Updated Date / Updated On / Last Updated
- Expiration Date / Expiry Date / Expires On / Expiration Time
```

### TRABIS Format (.tr Domains)

Turkish domain registry uses a dot-padded format:

```
** Domain Name: dgn.net.tr
Domain Status: Active

** Additional Info:
Created on..............: 2007-Jan-08.
Expires on..............: 2027-Jan-07.

** Whois Server:
Last Update Time: 2026-06-15T10:46:52+03:00
```

**Parsing characteristics:**
- Field names use dots as padding: `Created on..............:`
- Date values end with trailing period: `2007-Jan-08.`
- Date format: `YYYY-Mon-DD` (e.g., `2007-Jan-08`)
- Multi-line records with section headers prefixed with `**`

**Supported TRABIS field prefixes:**
```go
var trabisFieldPrefixes = []string{
    "Created on",
    "Expires on",
    "Last Update Time",
    "Domain Status",
    "Transfer Status",
    "Registrant",
    "Registrar",
    "NIC Handle",
    "Organization Name",
    "Address",
    "Phone",
    "Fax",
    "Domain Servers",
    "Additional Info",
}
```

### Date Format Handling

| Format | Example | Parser Pattern |
|--------|---------|----------------|
| ISO 8601 | `2020-01-01T00:00:00Z` | `2006-01-02T15:04:05Z07:00` |
| Standard WHOIS | `01-Jan-2020` | `02-Jan-2006` |
| TRABIS | `2007-Jan-08.` | `2006-Jan-02.` |
| US Format | `01/01/2020` | `01/02/2006` |
| European | `01.01.2020` | `01.02.2006` |

---

## RDAP Support

RDAP (Registration Data Access Protocol) is the modern replacement for WHOIS, providing structured JSON data instead of free-form text.

### Supported RDAP Servers

| TLD Category | RDAP Server | Notes |
|--------------|-------------|-------|
| Google TLDs | https://pubapi.registry.google/rdap | .dev, .app, .chrome, etc. |
| Verisign TLDs | https://rdap.verisign.com/{tld}/v1 | .com, .net, .cc |
| Identity Digital | https://rdap.nic.{tld} | .io, .co, .ai, .buzz |
| CentralNic | https://rdap.centralnic.com/{tld} | .click, .link, .cloud, etc. |
| Radix | https://rdap.radix.website | .online, .site, .website |
| Afilias | https://rdap.afilias.net | .info, .mobi, .pink |

### RDAP Response Structure

```json
{
  "objectClassName": "domain",
  "ldhName": "EXAMPLE.COM",
  "arinOrg": {
    "name": "Example Inc"
  },
  "events": [
    {
      "eventAction": "registration",
      "eventDate": "2020-01-01T00:00:00Z"
    },
    {
      "eventAction": "expiration",
      "eventDate": "2025-01-01T00:00:00Z"
    },
    {
      "eventAction": "last changed",
      "eventDate": "2024-01-01T00:00:00Z"
    }
  ],
  "nameservers": [
    {
      "objectClassName": "nameserver",
      "ldhName": "NS1.EXAMPLE.COM"
    }
  ],
  "secureDNS": {
    "delegationSigned": true
  }
}
```

### RDAP to WHOIS Fallback

When RDAP queries fail, the system automatically falls back to WHOIS:
1. Try RDAP query to known RDAP server
2. If RDAP fails or returns error, try WHOIS
3. If WHOIS succeeds, parse and return WHOIS data
4. If both fail, return error

---

## Dynamic Discovery

For TLDs not in the static maps, the system performs dynamic discovery:

### Discovery Flow

```
1. Check knownWhoisServers[tld]
   └── Found → Query WHOIS server directly

2. Check knownRdapServers[tld]
   └── Found → Query RDAP server

3. Query IANA WHOIS (whois.iana.org:43)
   └── Send: "example.tld\r\n"
   └── Parse response for "Referral URL" or "Whois Server"

4. Query IANA HTML page
   └── GET: https://www.iana.org/domains/root/db/{tld}.html
   └── Parse for RDAP server URLs

5. Try convertToRdapURL() on registry URL
   └── Convert WHOIS registry URL to RDAP endpoint
```

### IANA Response Parsing

IANA returns WHOIS information in multiple formats:

```
# Format 1: refer: field
Domain Name: example.tld
Registry Domain ID: XXXXX-TLD
Registrar WHOIS Server: whois.registry.tld

# Format 2: whois: field (used by some TLDs)
Domain Name: example.tld
whois: whois.registry.tld

# Format 3: Multiple TLDs with same server
Domain Name: example.com
Domain Name: example.net
Registrar: Example Registrar
```

### Registry URL to RDAP Conversion

The `convertToRdapURL()` function converts WHOIS registry URLs to RDAP endpoints:

```go
var registryPatterns = []struct {
    match *regexp.Regexp
    replace string
}{
    // Verisign patterns
    {`www\.verisign\.com`, "https://rdap.verisign.com"},
    {`whois\.verisign-grs\.com`, "https://rdap.verisign.com"},
    
    // PIR patterns
    {`whois\.pir\.org`, "https://rdap.publicinterestregistry.org"},
    
    // Afilias patterns
    {`whois\.afilias-(net|info|srs)\.net`, "https://rdap.afilias.net"},
    
    // CentralNic patterns
    {`whois\.centralnic(,|\.)`, "https://rdap.centralnic.com"},
    
    // ... 200+ more patterns
}
```

---

## Technical Implementation

### Code Structure

```
internal/tools/
├── whois.go           # Main WHOIS functionality
│   ├── knownWhoisServers   # 500+ TLD → WHOIS server map
│   ├── knownRdapServers    # 50+ TLD → RDAP server map
│   ├── trabisFieldPrefixes # .tr format field prefixes
│   ├── getWhoisServer()    # WHOIS server discovery
│   ├── queryWhois()        # TCP WHOIS query
│   ├── discoverTLDInfo()   # IANA dynamic discovery
│   ├── convertToRdapURL()  # Registry URL → RDAP URL
│   ├── parseWhoisResponse() # WHOIS text parsing
│   └── parseRdapResponse()  # RDAP JSON parsing
│
├── extra.go           # Domain extraction utilities
│   ├── knownTLDs           # Valid TLD recognition
│   ├── compoundTLDs         # Compound TLD extraction
│   └── ExtractDomainInfo()  # Domain info extractor
│
├── whois_test.go      # Unit tests
└── whois_debug_test.go # Debug/integration tests
```

### Key Functions

#### `CheckWhois(domain string) (*WhoisResult, error)`

Main entry point for WHOIS lookups:

```go
func CheckWhois(domain string) (*WhoisResult, error) {
    // 1. Extract TLD from domain
    tld := extractTLD(domain)
    
    // 2. Check known WHOIS servers
    if server := getWhoisServer(tld); server != "" {
        return queryWhoisServer(domain, server)
    }
    
    // 3. Check known RDAP servers
    if server := getRdapServer(tld); server != "" {
        return queryRdapServer(domain, server)
    }
    
    // 4. Dynamic IANA discovery
    return discoverAndQuery(domain, tld)
}
```

#### `extractTLD(domain string) string`

Extracts the TLD from a domain, handling compound TLDs:

```go
// Compound TLDs checked in order of likelihood
compoundTLDs := []string{
    "com.tr", "net.tr", "org.tr", "edu.tr", "gov.tr",
    "co.uk", "org.uk", "net.uk",
    "co.jp", "or.jp", "ne.jp", "ac.jp",
    "com.br", "net.br", "org.br",
    // ... 200+ more
}
```

#### `parseWhoisField(text, fieldPattern string) string`

Parses a field from WHOIS text with multiple format support:

```go
// Case-insensitive field matching
// Handles: "Field Name: value", "Field Name value", "Field Name........: value"
pattern := "(?i)" + fieldPattern + `[:\s]*([^\n]+)`
```

### Data Structures

```go
type WhoisResult struct {
    Domain       string            `json:"domain"`
    SLD          string            `json:"sld"`
    TLD          string            `json:"tld"`
    Registrar    string            `json:"registrar"`
    Nameservers  []string         `json:"name_servers"`
    CreatedDate  string            `json:"created_date,omitempty"`
    ExpiresDate  string            `json:"expires_date,omitempty"`
    UpdatedDate  string            `json:"updated_date,omitempty"`
    Status       string            `json:"domain_status,omitempty"`
    Raw          string            `json:"raw,omitempty"`
    Details      map[string]string `json:"details,omitempty"`
    Server       string            `json:"server,omitempty"`
    Duration     int64             `json:"duration_ms,omitempty"`
}
```

---

## Error Handling

### Error Types

| Error Code | Description | Resolution |
|------------|-------------|-------------|
| `WHOIS_TIMEOUT` | WHOIS server not responding | Try RDAP or IANA discovery |
| `WHOIS_NOT_FOUND` | Domain not registered | Domain is available |
| `WHOIS_PARSE_ERROR` | Unable to parse response | Check format changes |
| `RDAP_ERROR` | RDAP query failed | Fall back to WHOIS |
| `IANA_DISCOVERY_FAILED` | Cannot reach IANA | Check network |
| `INVALID_TLD` | TLD not recognized | Add to compoundTLDs |
| `CONNECTION_REFUSED` | Server refusing connections | Rate limiting or blocked |

### Error Recovery

```go
// Retry with exponential backoff
func queryWithRetry(domain, server string) (*WhoisResult, error) {
    maxRetries := 3
    for i := 0; i < maxRetries; i++ {
        result, err := queryWhoisServer(domain, server)
        if err == nil {
            return result, nil
        }
        if isRetryable(err) {
            backoff := time.Duration(math.Pow(2, float64(i))) * time.Second
            time.Sleep(backoff)
            continue
        }
        return nil, err
    }
    return nil, ErrMaxRetriesExceeded
}
```

### Rate Limiting

WHOIS servers may rate-limit or block excessive queries. The implementation:
- Tracks query counts per server
- Implements exponential backoff on 429 responses
- Falls back to alternative servers when available

---

## Testing

### Test Coverage

| Test File | Coverage |
|-----------|----------|
| whois_test.go | WHOIS parsing, server discovery, field extraction |
| extra_test.go | Domain extraction, TLD parsing |
| whois_integration_test.go | Real WHOIS server queries |

### Running Tests

```bash
# Run all WHOIS tests
go test ./internal/tools/... -run Whois -v

# Run specific test
go test ./internal/tools/... -run TestParseWhoisField -v

# Run with coverage
go test ./internal/tools/... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

### Tested Domains

| Domain | TLD | Expected Result |
|--------|-----|-----------------|
| sinema.co | .co | ✅ WHOIS: whois.registry.co |
| dgn.net.tr | .net.tr | ✅ WHOIS: whois.trabis.gov.tr |
| wrongstack.com | .com | ✅ WHOIS: whois.verisign-grs.com |
| ecostack.cloud | .cloud | ✅ WHOIS: whois.nic.cloud |
| example.dev | .dev | ✅ RDAP: pubapi.registry.google |
| example.app | .app | ✅ RDAP: pubapi.registry.google |

---

## Roadmap

### Short-term (1-2 months)
- [ ] Implement Redis cache for WHOIS results
- [ ] Add domain age calculation
- [ ] Add expiry date alerts
- [ ] Implement rate limiting per WHOIS server

### Medium-term (3-6 months)
- [ ] WHOIS history API integration (Archive.org, WhoisXML)
- [ ] Batch query support
- [ ] Connection pooling for WHOIS TCP connections
- [ ] Monitoring dashboard

### Long-term (6+ months)
- [ ] ML-based domain analysis
- [ ] Registrar price comparison
- [ ] DNS-based alternative discovery
- [ ] Blockchain domain support (.eth, .crypto)

---

## References

### WHOIS Resources
- [IANA Root Zone Database](https://www.iana.org/domains/root/db)
- [VeriSign WHOIS Gateway](https://www.verisign.com/en_US/domain-names/whois/index.xhtml)
- [PIR WHOIS](https://whois.pir.org)
- [TRABIS WHOIS](https://www.trabis.gov.tr)

### RDAP Resources
- [IANA RDAP Bootstrap](https://www.iana.org/assignments/rdap/rdap.xhtml)
- [RFC 7480 - HTTP Usage in RDAP](https://tools.ietf.org/html/rfc7480)
- [RFC 7481 - Security Threats for RDAP](https://tools.ietf.org/html/rfc7481)

### Country Registry Contacts
| Country | Registry | WHOIS Server |
|---------|----------|-------------|
| Turkey | TRABIS | whois.trabis.gov.tr |
| USA | VeriSign | whois.verisign-grs.com |
| EU | EURid | whois.eu |
| Japan | JPRS | whois.jprs.jp |
| Korea | KISA | whois.kr |
| China | CNNIC | whois.cnnic.cn |
| Brazil | NIC.br | whois.registro.br |
| Australia | auDA | whois.auda.org.au |
| UK | Nominet | whois.nic.uk |
| Germany | DENIC | whois.denic.de |
| France | AFNIC | whois.nic.fr |

---

*Document Version: 1.0.0*
*Last Updated: 2026-06-15*
*Project: MailForge*
