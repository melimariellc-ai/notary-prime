export type CityPage = {
  slug: string;
  name: string;
  county: string;
  /** Google Maps embed lat,lng + zoom for this city. */
  mapSrc: string;
  headline: string;
  intro: string;
  /** 2–3 paragraphs of genuinely local detail. */
  body: string[];
  neighborhoods: string[];
  zips: string[];
  travel: string;
  /** Local, city-specific use cases. */
  useCases: { title: string; text: string }[];
  nearby: string[];
};

export const cities: CityPage[] = [
  {
    slug: "dallas",
    name: "Dallas",
    county: "Dallas County",
    mapSrc: "https://www.google.com/maps?ll=32.7767,-96.7970&z=11&output=embed",
    headline: "Mobile Notary in Dallas, Texas",
    intro:
      "A commissioned Texas notary who comes to your home, office, hospital room, or coffee shop anywhere in Dallas, usually the same day.",
    body: [
      "Dallas signings run the full range, from a single power of attorney at a Lake Highlands kitchen table to a full refinance package in a Downtown high rise conference room. Enliven Notary travels to you with a current commission, journal, and the seal already in hand, so nothing stalls waiting on paperwork.",
      "Downtown, Uptown, and the Design District mean parking garages, badge desks, and freight elevators. We plan for that: arrival time is confirmed in advance, building access instructions are collected when you book, and we build in the extra minutes so a garage line never turns into a missed signing.",
      "Medical signings are common here. Baylor Scott & White on Gaston, Methodist Dallas in Oak Cliff, UT Southwestern and Parkland in the Medical District: bedside notarizations happen every week, with the patience and discretion those appointments require.",
    ],
    neighborhoods: [
      "Downtown & Uptown",
      "Oak Lawn",
      "Bishop Arts / Oak Cliff",
      "Lakewood & Lake Highlands",
      "Preston Hollow",
      "Deep Ellum",
      "Design District",
      "Far North Dallas",
    ],
    zips: ["75201", "75204", "75206", "75214", "75219", "75225", "75230", "75243"],
    travel: "Typically 20–40 minutes from central DFW, same-day slots common.",
    useCases: [
      {
        title: "Hospital & bedside signings",
        text: "Baylor, Methodist Dallas, Parkland, and UT Southwestern. Medical POAs, directives, and guardianship paperwork handled calmly at the bedside.",
      },
      {
        title: "Downtown office & title closings",
        text: "Conference room or lobby signings for title companies, law firms, and lenders, with building access coordinated ahead of time.",
      },
      {
        title: "Estate & POA documents",
        text: "Wills, trusts, statutory durable powers of attorney, and transfer on death deeds notarized at home with witnesses arranged if needed.",
      },
    ],
    nearby: ["irving", "arlington", "plano"],
  },
  {
    slug: "fort-worth",
    name: "Fort Worth",
    county: "Tarrant County",
    mapSrc: "https://www.google.com/maps?ll=32.7555,-97.3308&z=11&output=embed",
    headline: "Mobile Notary in Fort Worth, Texas",
    intro:
      "Mobile notary service across Fort Worth, from Downtown and the Near Southside to Alliance and the far west side.",
    body: [
      "Fort Worth is spread out, and that shapes how appointments get scheduled. A signing in Alliance and a signing on the Near Southside are half an hour apart, so we confirm a firm arrival window rather than a vague morning or afternoon and hold it.",
      "The Near Southside medical district keeps us busy: Baylor Scott & White All Saints, Texas Health Harris Methodist, and Cook Children's. Bedside signings there mean working around nursing rounds, checking the signer is alert and willing, and never rushing an appointment that needs time.",
      "Oil, gas, and land paperwork show up more often in Tarrant County than in most of the Metroplex. Mineral deeds, division orders, and lease ratifications frequently need multiple signers and consistent acknowledgment wording across a stack, which is exactly the kind of detail work a careful notary should handle without being asked twice.",
    ],
    neighborhoods: [
      "Downtown & Sundance Square",
      "Near Southside",
      "TCU / Westcliff",
      "Cultural District",
      "Alliance / Far North",
      "Arlington Heights",
      "Fairmount",
      "Benbrook area",
    ],
    zips: ["76102", "76104", "76107", "76109", "76116", "76132", "76137", "76244"],
    travel: "Typically 30–50 minutes from central DFW, appointments recommended.",
    useCases: [
      {
        title: "Mineral, oil & gas documents",
        text: "Division orders, mineral deeds, and lease ratifications, including multi signer stacks that must be acknowledged consistently.",
      },
      {
        title: "Near Southside hospital signings",
        text: "All Saints, Harris Methodist, and Cook Children's. Medical POAs and directives handled quietly at the bedside.",
      },
      {
        title: "Loan signings for Tarrant title offices",
        text: "Refinances, purchases, HELOCs, and sellers packages returned promptly and complete, with FedEx drop included.",
      },
    ],
    nearby: ["arlington", "irving", "dallas"],
  },
  {
    slug: "plano",
    name: "Plano",
    county: "Collin County",
    mapSrc: "https://www.google.com/maps?ll=33.0198,-96.6989&z=12&output=embed",
    headline: "Mobile Notary in Plano, Texas",
    intro:
      "Notary who comes to you in Plano: Legacy West offices, Willow Bend homes, and everywhere between.",
    body: [
      "Plano is one of our busiest cities, and the mix is distinctive. Corporate relocation paperwork from the Legacy West and Granite Park employers, Texas Health Presbyterian Plano bedside signings, and a steady stream of estate documents from West Plano households.",
      "Corporate signers usually want speed with no fuss: a lobby or conference room appointment that takes fifteen minutes between meetings. We come to the office, verify ID, complete the notarial certificate, and leave without disrupting the day.",
      "Relocation and international paperwork are frequent here too. Apostille preparation, consular forms, and out of state deeds all get notarized with the correct Texas wording, so a document does not come back rejected after it has already crossed a border.",
    ],
    neighborhoods: [
      "Legacy West",
      "West Plano / Willow Bend",
      "Downtown Plano",
      "Preston Meadow",
      "Deerfield",
      "Shoal Creek",
      "Hunters Glen",
      "Granite Park",
    ],
    zips: ["75023", "75024", "75025", "75074", "75075", "75093", "75094"],
    travel: "Typically 25–45 minutes from central DFW, evening slots available.",
    useCases: [
      {
        title: "Corporate & relocation paperwork",
        text: "Lobby or conference room signings near Legacy West and Granite Park, done in fifteen minutes between meetings.",
      },
      {
        title: "Apostille & international documents",
        text: "Correct Texas notarial wording for documents headed to the Secretary of State or a consulate, so nothing bounces back.",
      },
      {
        title: "Estate planning at home",
        text: "Wills, trusts, and medical directives notarized at your kitchen table, evenings and weekends included.",
      },
    ],
    nearby: ["frisco", "dallas", "irving"],
  },
  {
    slug: "frisco",
    name: "Frisco",
    county: "Collin & Denton Counties",
    mapSrc: "https://www.google.com/maps?ll=33.1507,-96.8236&z=12&output=embed",
    headline: "Mobile Notary in Frisco, Texas",
    intro:
      "Mobile and online notary throughout Frisco, from The Star and Frisco Square to the newest neighborhoods north of 380.",
    body: [
      "Frisco is still building, and real estate paperwork dominates. New construction closings, builder addenda, and title company packages are the everyday work here, along with the seller side documents for families moving up within the same zip code.",
      "Growth also means addresses that navigation apps have not caught up with. When you book, include the gate code, the builder lot number, or a cross street, and we will find you rather than circling a half finished subdivision.",
      "Baylor Scott & White Frisco and the surrounding medical offices bring in medical POA and directive signings, and the corporate corridor along the Dallas North Tollway generates a steady stream of quick office notarizations.",
    ],
    neighborhoods: [
      "Frisco Square",
      "The Star district",
      "Starwood",
      "Newman Village",
      "Phillips Creek Ranch",
      "Panther Creek",
      "Richwoods",
      "North of US 380",
    ],
    zips: ["75033", "75034", "75035", "75036", "75068", "75078"],
    travel: "Typically 35–55 minutes from central DFW, book ahead for morning slots.",
    useCases: [
      {
        title: "New construction closings",
        text: "Builder packages, addenda, and title documents signed on site or at home, with every notarial certificate completed correctly.",
      },
      {
        title: "Loan signing agent services",
        text: "Purchases, refinances, and sellers packages for Frisco and Collin County title offices, scanned back same day when needed.",
      },
      {
        title: "Remote Online Notary",
        text: "Signers traveling or out of state can notarize from a laptop in minutes, valid anywhere in Texas.",
      },
    ],
    nearby: ["plano", "dallas", "irving"],
  },
  {
    slug: "arlington",
    name: "Arlington",
    county: "Tarrant County",
    mapSrc: "https://www.google.com/maps?ll=32.7357,-97.1081&z=12&output=embed",
    headline: "Mobile Notary in Arlington, Texas",
    intro:
      "Centrally located between Dallas and Fort Worth, Arlington is one of the quickest cities for us to reach.",
    body: [
      "Sitting mid Metroplex, Arlington often gets the fastest arrival times we offer. Same day appointments are realistic here, including short notice requests that other notaries turn down.",
      "The city's mix is broad: UT Arlington students needing affidavits and enrollment paperwork, families near Viridian and south Arlington handling estate documents, and Medical City Arlington and Texas Health Arlington Memorial for bedside signings.",
      "Event traffic is a real scheduling factor. On Cowboys and Rangers game days the entrance district around AT&T Stadium and Globe Life Field slows to a crawl, so we either build in extra time or suggest a window before gates open.",
    ],
    neighborhoods: [
      "Downtown & UTA",
      "Entertainment District",
      "North Arlington",
      "South Arlington",
      "Viridian",
      "Dalworthington Gardens area",
      "Pantego area",
      "Southwest Arlington",
    ],
    zips: ["76001", "76002", "76006", "76010", "76012", "76013", "76015", "76017"],
    travel: "Typically 15–30 minutes from central DFW, our fastest response area.",
    useCases: [
      {
        title: "Same-day & short-notice signings",
        text: "Central location means we can often be at your door within a couple of hours, including evenings.",
      },
      {
        title: "Student & affidavit paperwork",
        text: "UT Arlington affidavits, enrollment forms, sworn statements, and copy certifications by document custodian.",
      },
      {
        title: "Hospital signings",
        text: "Medical City Arlington and Arlington Memorial. Medical POAs and directives handled with discretion.",
      },
    ],
    nearby: ["fort-worth", "irving", "dallas"],
  },
  {
    slug: "irving",
    name: "Irving",
    county: "Dallas County",
    mapSrc: "https://www.google.com/maps?ll=32.8140,-96.9489&z=12&output=embed",
    headline: "Mobile Notary in Irving & Las Colinas, Texas",
    intro:
      "Mobile notary for Irving, Las Colinas, and Valley Ranch, minutes from DFW Airport for travelers on a deadline.",
    body: [
      "Las Colinas is corporate territory, and the requests reflect it: lobby signings, conference room appointments, corporate resolutions, and employment or vendor paperwork that needs a notarial certificate before a deadline closes.",
      "Being minutes from DFW Airport makes Irving the practical choice for anyone signing between flights. Airport hotels along the north and south entrances work well as meeting points when a document has to be notarized before departure.",
      "Irving is also one of the most internationally diverse cities in Texas, and that shows up in the paperwork: apostille preparation, consular forms, foreign property documents, and affidavits for immigration filings, all requiring exact Texas wording and careful ID verification.",
    ],
    neighborhoods: [
      "Las Colinas",
      "Valley Ranch",
      "Urban Center",
      "South Irving",
      "Hackberry Creek",
      "MacArthur corridor",
      "Near DFW Airport",
      "Downtown Irving / Heritage",
    ],
    zips: ["75038", "75039", "75060", "75061", "75062", "75063"],
    travel: "Typically 20–35 minutes from central DFW, close to DFW Airport.",
    useCases: [
      {
        title: "Corporate & business documents",
        text: "Las Colinas conference room signings for resolutions, vendor agreements, and corporate certifications.",
      },
      {
        title: "Airport-area signings",
        text: "Notarize between flights at an airport hotel or lounge, minutes from both DFW terminals.",
      },
      {
        title: "Apostille & consular paperwork",
        text: "Documents headed abroad, prepared with the correct Texas notarial wording for Secretary of State authentication.",
      },
    ],
    nearby: ["dallas", "arlington", "plano"],
  },
];

export const cityBySlug = (slug: string) => cities.find((c) => c.slug === slug);
