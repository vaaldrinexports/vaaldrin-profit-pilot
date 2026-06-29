// Bundled trade datasets for India exporters.
// Phase 1: top 20 export HS codes + duty lookup for major destinations + country risk.
// Sources: India RoDTEP notifications (CBIC), WTO Tariff Data, EU TARIC, World Bank governance indicators (2024).
// Rates are indicative; verify before final quotation.

export interface HsCodeEntry {
  hsCode: string;       // dotted format e.g. "1006.30.20"
  hsCodeFlat: string;   // "10063020"
  name: string;         // common product name
  category: string;
  rodtepPct: number;    // %
  dutyDrawbackPct: number; // %
  keywords: string[];   // for search
}

export const HS_CODES: HsCodeEntry[] = [
  // ---------------- Cereals ----------------
  { hsCode: "1006.30.20", hsCodeFlat: "10063020", name: "Basmati Rice", category: "Cereals", rodtepPct: 0.7, dutyDrawbackPct: 1.5, keywords: ["basmati","rice","1121","pusa"] },
  { hsCode: "1006.30.90", hsCodeFlat: "10063090", name: "Non-Basmati Rice", category: "Cereals", rodtepPct: 1.4, dutyDrawbackPct: 1.7, keywords: ["non-basmati","rice","sona","masoori","ir64"] },

  // ---------------- Coffee & Tea ----------------
  { hsCode: "0901.11.11", hsCodeFlat: "09011111", name: "Coffee, Green Arabica (unroasted)", category: "Beverages", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["coffee","arabica","green coffee","unroasted"] },
  { hsCode: "0901.11.12", hsCodeFlat: "09011112", name: "Coffee, Green Robusta (unroasted)", category: "Beverages", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["coffee","robusta","green coffee","unroasted"] },
  { hsCode: "0901.21.00", hsCodeFlat: "09012100", name: "Coffee, Roasted (not decaf)", category: "Beverages", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["coffee","arabica","robusta","roasted"] },
  { hsCode: "0902.30.10", hsCodeFlat: "09023010", name: "Black Tea (packets ≤3 kg)", category: "Beverages", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["tea","black tea","darjeeling","assam","ctc"] },
  { hsCode: "0902.40.40", hsCodeFlat: "09024040", name: "Green Tea (bulk)", category: "Beverages", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["tea","green tea","nilgiri"] },

  // ---------------- Spices: Pepper ----------------
  { hsCode: "0904.11.10", hsCodeFlat: "09041110", name: "Black Pepper, Whole (Malabar Garbled)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["pepper","black pepper","whole pepper","malabar","mg1","tellicherry","kali mirch","spice"] },
  { hsCode: "0904.11.20", hsCodeFlat: "09041120", name: "White Pepper, Whole", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["white pepper","whole","spice"] },
  { hsCode: "0904.12.00", hsCodeFlat: "09041200", name: "Black Pepper, Powder / Crushed", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["pepper powder","black pepper powder","crushed pepper","ground pepper","spice"] },
  { hsCode: "0904.12.10", hsCodeFlat: "09041210", name: "White Pepper, Powder", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["white pepper powder","ground","spice"] },

  // ---------------- Spices: Chilli ----------------
  { hsCode: "0904.21.10", hsCodeFlat: "09042110", name: "Chillies, Dried Whole (Guntur / Byadgi / Teja)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["chilli","chillies","red chilli","whole chilli","guntur","byadgi","teja","sannam","334","s17","mirch","spice"] },
  { hsCode: "0904.22.11", hsCodeFlat: "09042211", name: "Chilli Powder", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["chilli powder","red chilli powder","ground chilli","mirch powder","spice"] },
  { hsCode: "0904.22.12", hsCodeFlat: "09042212", name: "Paprika / Sweet Chilli Powder", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["paprika","sweet chilli","byadgi powder","spice"] },

  // ---------------- Spices: Cardamom ----------------
  { hsCode: "0908.31.10", hsCodeFlat: "09083110", name: "Cardamom, Large (Black, Whole)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["cardamom","large cardamom","black cardamom","badi elaichi","spice"] },
  { hsCode: "0908.32.10", hsCodeFlat: "09083210", name: "Cardamom, Small (Green, Whole)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["cardamom","green cardamom","small cardamom","elaichi","aaa","aa","spice"] },
  { hsCode: "0908.32.20", hsCodeFlat: "09083220", name: "Cardamom, Powder", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["cardamom powder","elaichi powder","ground cardamom","spice"] },

  // ---------------- Spices: Turmeric (the user specifically asked) ----------------
  { hsCode: "0910.30.10", hsCodeFlat: "09103010", name: "Turmeric, Fresh (Rhizome)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["turmeric","fresh turmeric","haldi","kachhi haldi","rhizome","spice"] },
  { hsCode: "0910.30.20", hsCodeFlat: "09103020", name: "Turmeric, Dried Fingers (Salem / Erode / Nizamabad)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["turmeric fingers","haldi fingers","dried turmeric","salem fingers","erode","nizamabad","alleppey finger","spice"] },
  { hsCode: "0910.30.30", hsCodeFlat: "09103030", name: "Turmeric, Bulbs", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["turmeric bulbs","haldi bulb","round turmeric","gattha","spice"] },
  { hsCode: "0910.30.90", hsCodeFlat: "09103090", name: "Turmeric, Powder", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["turmeric powder","haldi powder","curcumin powder","ground turmeric","spice"] },

  // ---------------- Spices: Cumin / Coriander / Fenugreek / Fennel ----------------
  { hsCode: "0909.31.10", hsCodeFlat: "09093110", name: "Cumin Seeds (Jeera), Whole", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["cumin","jeera","whole cumin","spice"] },
  { hsCode: "0909.32.10", hsCodeFlat: "09093210", name: "Cumin Powder (Jeera Powder)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["cumin powder","jeera powder","ground cumin","spice"] },
  { hsCode: "0909.21.10", hsCodeFlat: "09092110", name: "Coriander Seeds, Whole", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["coriander","dhania","whole coriander","spice"] },
  { hsCode: "0909.22.10", hsCodeFlat: "09092210", name: "Coriander Powder (Dhania)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["coriander powder","dhania powder","ground coriander","spice"] },
  { hsCode: "0910.99.11", hsCodeFlat: "09109911", name: "Fenugreek Seeds (Methi), Whole", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["fenugreek","methi","whole methi","spice"] },
  { hsCode: "0910.99.12", hsCodeFlat: "09109912", name: "Fenugreek Powder (Methi Powder)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["fenugreek powder","methi powder","spice"] },
  { hsCode: "0909.61.10", hsCodeFlat: "09096110", name: "Fennel Seeds (Saunf), Whole", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["fennel","saunf","whole fennel","spice"] },
  { hsCode: "0909.62.10", hsCodeFlat: "09096210", name: "Fennel Powder (Saunf Powder)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["fennel powder","saunf powder","spice"] },

  // ---------------- Spices: Ginger / Clove / Cinnamon / Nutmeg / Mace / Bay leaf / Mustard / Ajwain / Asafoetida ----------------
  { hsCode: "0910.11.10", hsCodeFlat: "09101110", name: "Ginger, Fresh", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["ginger","fresh ginger","adrak","spice"] },
  { hsCode: "0910.11.20", hsCodeFlat: "09101120", name: "Ginger, Dried (Whole / Sonth)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["dried ginger","sonth","whole ginger","spice"] },
  { hsCode: "0910.12.10", hsCodeFlat: "09101210", name: "Ginger Powder (Sonth Powder)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["ginger powder","sonth powder","ground ginger","spice"] },
  { hsCode: "0907.10.10", hsCodeFlat: "09071010", name: "Cloves, Whole", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["clove","cloves","whole clove","laung","spice"] },
  { hsCode: "0907.20.00", hsCodeFlat: "09072000", name: "Clove Powder", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["clove powder","laung powder","spice"] },
  { hsCode: "0906.11.10", hsCodeFlat: "09061110", name: "Cinnamon, Whole (Quills)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["cinnamon","dalchini","quills","whole cinnamon","spice"] },
  { hsCode: "0906.20.00", hsCodeFlat: "09062000", name: "Cinnamon Powder (Dalchini)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["cinnamon powder","dalchini powder","ground cinnamon","spice"] },
  { hsCode: "0908.11.00", hsCodeFlat: "09081100", name: "Nutmeg, Whole", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["nutmeg","whole nutmeg","jaiphal","spice"] },
  { hsCode: "0908.12.00", hsCodeFlat: "09081200", name: "Nutmeg Powder", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["nutmeg powder","jaiphal powder","spice"] },
  { hsCode: "0908.21.00", hsCodeFlat: "09082100", name: "Mace, Whole (Javitri)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["mace","javitri","whole mace","spice"] },
  { hsCode: "0908.22.00", hsCodeFlat: "09082200", name: "Mace Powder", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["mace powder","javitri powder","spice"] },
  { hsCode: "0910.99.21", hsCodeFlat: "09109921", name: "Bay Leaves (Tej Patta)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["bay leaf","bay leaves","tej patta","spice"] },
  { hsCode: "1207.50.90", hsCodeFlat: "12075090", name: "Mustard Seeds (Sarson), Whole", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["mustard","sarson","rai","whole mustard","spice"] },
  { hsCode: "0910.99.23", hsCodeFlat: "09109923", name: "Ajwain (Carom Seeds), Whole", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["ajwain","carom","carom seeds","spice"] },
  { hsCode: "1301.90.13", hsCodeFlat: "13019013", name: "Asafoetida (Hing)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["asafoetida","hing","spice"] },

  // ---------------- Spice blends / Curry powders ----------------
  { hsCode: "0910.91.00", hsCodeFlat: "09109100", name: "Curry / Masala Powder (Mixed Spice)", category: "Spices", rodtepPct: 2.5, dutyDrawbackPct: 2.0, keywords: ["curry powder","masala","garam masala","sambar","biryani masala","mixed spice"] },

  // ---------------- Textiles & Apparel ----------------
  { hsCode: "5201.00.15", hsCodeFlat: "52010015", name: "Cotton, raw (long staple)", category: "Textiles", rodtepPct: 1.7, dutyDrawbackPct: 1.5, keywords: ["cotton","raw cotton","fibre"] },
  { hsCode: "5208.42.90", hsCodeFlat: "52084290", name: "Cotton Woven Fabric, dyed", category: "Textiles", rodtepPct: 3.4, dutyDrawbackPct: 2.5, keywords: ["cotton fabric","woven","dyed","textile"] },
  { hsCode: "6109.10.00", hsCodeFlat: "61091000", name: "Cotton T-Shirts, knitted", category: "Apparel", rodtepPct: 4.3, dutyDrawbackPct: 2.8, keywords: ["t-shirt","tshirt","apparel","garment","knitted"] },
  { hsCode: "6203.42.00", hsCodeFlat: "62034200", name: "Men's Cotton Trousers", category: "Apparel", rodtepPct: 4.3, dutyDrawbackPct: 2.8, keywords: ["trouser","pants","jeans","apparel","cotton"] },

  // ---------------- Leather / Jewellery / Pharma / Automotive / Seafood ----------------
  { hsCode: "4202.22.20", hsCodeFlat: "42022220", name: "Leather Handbags", category: "Leather", rodtepPct: 2.5, dutyDrawbackPct: 2.5, keywords: ["handbag","purse","leather","bag"] },
  { hsCode: "6403.99.90", hsCodeFlat: "64039990", name: "Leather Footwear", category: "Leather", rodtepPct: 2.4, dutyDrawbackPct: 2.6, keywords: ["shoes","footwear","leather","sandals"] },
  { hsCode: "7113.19.10", hsCodeFlat: "71131910", name: "Gold Jewellery (studded)", category: "Gems & Jewellery", rodtepPct: 0.5, dutyDrawbackPct: 0.0, keywords: ["jewellery","jewelry","gold","studded","diamond"] },
  { hsCode: "3004.90.99", hsCodeFlat: "30049099", name: "Pharmaceutical Formulations", category: "Pharma", rodtepPct: 0.7, dutyDrawbackPct: 1.0, keywords: ["pharma","medicine","drug","formulation","tablet"] },
  { hsCode: "8703.23.91", hsCodeFlat: "87032391", name: "Passenger Cars (1500-3000cc)", category: "Automotive", rodtepPct: 1.0, dutyDrawbackPct: 1.5, keywords: ["car","passenger","automobile","vehicle"] },
  { hsCode: "8708.99.00", hsCodeFlat: "87089900", name: "Auto Components / Parts", category: "Automotive", rodtepPct: 1.7, dutyDrawbackPct: 2.0, keywords: ["auto parts","components","spare","automotive"] },
  { hsCode: "0306.17.00", hsCodeFlat: "03061700", name: "Frozen Shrimp / Prawns", category: "Seafood", rodtepPct: 2.5, dutyDrawbackPct: 2.4, keywords: ["shrimp","prawn","seafood","frozen","vannamei"] },

  // ---------------- Herbal / Botanicals ----------------
  { hsCode: "1211.90.29", hsCodeFlat: "12119029", name: "Moringa Leaves / Powder", category: "Herbal", rodtepPct: 1.4, dutyDrawbackPct: 1.5, keywords: ["moringa","drumstick leaves","moringa powder","herbal"] },
  { hsCode: "1211.90.22", hsCodeFlat: "12119022", name: "Ashwagandha Root", category: "Herbal", rodtepPct: 1.4, dutyDrawbackPct: 1.5, keywords: ["ashwagandha","withania","herbal"] },
  { hsCode: "1211.90.46", hsCodeFlat: "12119046", name: "Tulsi (Holy Basil) Leaves", category: "Herbal", rodtepPct: 1.4, dutyDrawbackPct: 1.5, keywords: ["tulsi","holy basil","herbal"] },
  { hsCode: "0712.20.00", hsCodeFlat: "07122000", name: "Dried Onion Flakes / Powder", category: "Dried Products", rodtepPct: 1.7, dutyDrawbackPct: 1.5, keywords: ["dried onion","onion flakes","onion powder","dehydrated onion"] },
  { hsCode: "0712.90.40", hsCodeFlat: "07129040", name: "Dried Garlic Flakes / Powder", category: "Dried Products", rodtepPct: 1.7, dutyDrawbackPct: 1.5, keywords: ["dried garlic","garlic flakes","garlic powder","dehydrated garlic"] },
  { hsCode: "0712.90.90", hsCodeFlat: "07129090", name: "Curry Leaves, Dried", category: "Dried Products", rodtepPct: 1.7, dutyDrawbackPct: 1.5, keywords: ["curry leaves","kadi patta","dried curry leaf"] },
];

// ---------------- Product grade dictionary ----------------
// Maps a selected HS code (or product keyword) to canonical grade/variety options.
// User can still type a free-text grade if the product is not listed.

export const GRADES_BY_HS: Record<string, string[]> = {
  // Rice
  "1006.30.20": ["1121 Steam","1121 Sella","1121 Raw","Pusa Basmati Steam","Pusa Basmati Sella","Traditional Basmati","Sugandha Steam","Sharbati Steam"],
  "1006.30.90": ["IR-64 Parboiled","IR-64 Raw","Sona Masoori Raw","Sona Masoori Steam","PR-11 Sella","PR-14 Sella","Swarna Parboiled"],
  // Coffee
  "0901.11.11": ["Plantation A","Plantation AA","Plantation AB","Plantation PB","Specialty (84+ cupping)"],
  "0901.11.12": ["Cherry AB","Cherry PB","Parchment AB","Parchment PB","Kaapi Royale"],
  "0901.21.00": ["Medium Roast","Dark Roast","French Roast","Espresso Blend","Filter Blend"],
  // Tea
  "0902.30.10": ["BOPSM","BOPL","BPS","PD","FOF","Dust","CTC BP","CTC PF","CTC PD","CTC Dust"],
  "0902.40.40": ["Sencha","Gunpowder","Hyson","Young Hyson","Orthodox Green"],
  // Black pepper
  "0904.11.10": ["MG1 (Malabar Garbled 1)","MG2","Tellicherry Special Extra Bold (TGSEB)","Tellicherry Extra Bold (TGEB)","Tellicherry Bold (TGB)","550 GL","500 GL","ASTA Cleaned"],
  "0904.11.20": ["White Pepper Grade A","White Pepper Grade B","Decorticated"],
  "0904.12.00": ["40 Mesh","60 Mesh","80 Mesh","Crushed (Coarse)","ASTA Cleaned Powder"],
  "0904.12.10": ["40 Mesh","60 Mesh","80 Mesh"],
  // Chilli
  "0904.21.10": ["Guntur Sannam S4 (Stemless)","Guntur Sannam S4 (With Stem)","Teja S17","334","Byadgi Kaddi","Byadgi Dabbi","Wonder Hot","US-341","Endo"],
  "0904.22.11": ["40 Mesh","60 Mesh","80 Mesh","ASTA 20","ASTA 40","ASTA 60","ASTA 80","ASTA 120"],
  "0904.22.12": ["Paprika ASTA 80","Paprika ASTA 120","Paprika ASTA 160","Byadgi Powder"],
  // Cardamom
  "0908.31.10": ["Badi Elaichi Grade 1","Grade 2","Grade 3"],
  "0908.32.10": ["AAA 8mm+","AAA 7-8mm","AA 7mm+","A 6-7mm","B 5-6mm","C <5mm","Bleached"],
  "0908.32.20": ["Pure Green Cardamom Powder","Mixed Cardamom Powder"],
  // Turmeric
  "0910.30.10": ["Alleppey Fresh","Salem Fresh","Erode Fresh"],
  "0910.30.20": ["Alleppey Finger (Curcumin 3.5%+)","Salem Finger (Curcumin 3%+)","Erode Finger","Nizamabad Finger","Rajapuri Finger","Sangli Finger"],
  "0910.30.30": ["Erode Bulb","Salem Bulb","Rajapuri Bulb"],
  "0910.30.90": ["Curcumin 2%","Curcumin 3%","Curcumin 4%","Curcumin 5%","Curcumin 5%+ (Premium)","Polished Powder"],
  // Cumin
  "0909.31.10": ["Singapore Quality 99/1","Europe Quality 99.5/0.5","Machine Cleaned 99/1","Sortex Cleaned"],
  "0909.32.10": ["Cumin Powder Grade A","Cumin Powder Grade B"],
  // Coriander
  "0909.21.10": ["Eagle Quality","Scooter Quality","Parrot Quality","Single Parrot","Double Parrot","Split"],
  "0909.22.10": ["Coriander Powder A","Coriander Powder B"],
  // Ginger
  "0910.11.10": ["Fresh Cochin","Fresh Wayanad","Fresh Karnataka"],
  "0910.11.20": ["Bleached Sortex","Unbleached Sortex","Cochin Dry Ginger","Calicut Dry Ginger"],
  "0910.12.10": ["Ginger Powder A","Ginger Powder B"],
  // Cloves
  "0907.10.10": ["Whole Hand Picked","Headless","Mother Clove"],
  "0907.20.00": ["Clove Powder Premium","Clove Powder Standard"],
  // Cinnamon
  "0906.11.10": ["Cassia Whole","Ceylon True Cinnamon","Broken Quills"],
  "0906.20.00": ["Cinnamon Powder Premium","Cinnamon Powder Standard"],
  // Nutmeg / Mace
  "0908.11.00": ["Shelled Sound","Shelled BWP (Broken Wormy Punky)","In-Shell"],
  "0908.12.00": ["Nutmeg Powder Premium","Nutmeg Powder Standard"],
  "0908.21.00": ["Mace Whole Premium (Bright Red)","Mace Whole Standard","Mace Broken"],
  // Fenugreek / Fennel / Bay leaf / Mustard / Ajwain / Hing
  "0910.99.11": ["Sortex Cleaned","Machine Cleaned","Standard"],
  "0910.99.12": ["Methi Powder Premium","Methi Powder Standard"],
  "0909.61.10": ["Lucknowi Saunf","Gujarati Saunf","Sortex Cleaned"],
  "0910.99.21": ["Whole Hand Picked","Standard Whole","Broken"],
  "1207.50.90": ["Yellow Mustard","Black Mustard","Brown Mustard"],
  "0910.99.23": ["Sortex Cleaned","Machine Cleaned"],
  "1301.90.13": ["Compounded Hing","Pure Hing"],
  // Curry blends
  "0910.91.00": ["Garam Masala","Sambar Powder","Biryani Masala","Chicken Masala","Chana Masala","Pav Bhaji Masala","Tandoori Masala"],
  // Textiles
  "5201.00.15": ["Shankar-6","MCU-5","DCH-32","Suvin","Bunny"],
  "6109.10.00": ["20s Single Jersey","30s Single Jersey","40s Combed","Pique","Interlock"],
  // Herbal
  "1211.90.29": ["Moringa Powder Premium","Moringa Powder Standard","Moringa Leaves Whole"],
  "1211.90.22": ["Ashwagandha Root Whole","Ashwagandha Root Powder","Ashwagandha Extract 2.5%","Extract 5%"],
  // Dried products
  "0712.20.00": ["Onion Flakes White","Onion Flakes Pink","Onion Powder","Onion Granules","Onion Minced"],
  "0712.90.40": ["Garlic Flakes","Garlic Powder","Garlic Granules","Garlic Minced"],
  "0712.90.90": ["Curry Leaves Whole","Curry Leaves Powder"],
  // Seafood
  "0306.17.00": ["Vannamei HLSO 16/20","HLSO 21/25","HLSO 26/30","PD 31/40","PD 41/50","Black Tiger HOSO"],
};

/** Resolve grade options for the current product. Accepts HS code or product name. */
export function gradesFor(hsCode: string, productName: string): string[] {
  if (hsCode && GRADES_BY_HS[hsCode]) return GRADES_BY_HS[hsCode];
  if (!productName) return [];
  // try keyword fallback
  const matches = searchHsCodes(productName, 1);
  if (matches.length && GRADES_BY_HS[matches[0].hsCode]) return GRADES_BY_HS[matches[0].hsCode];
  return [];
}

export function searchHsCodes(query: string, limit = 8): HsCodeEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = HS_CODES.map((e) => {
    const hay = [e.name.toLowerCase(), e.hsCode, e.hsCodeFlat, e.category.toLowerCase(), ...e.keywords].join(" ");
    let score = 0;
    if (e.name.toLowerCase().startsWith(q)) score += 10;
    if (hay.includes(q)) score += 5;
    for (const k of e.keywords) if (k.includes(q)) score += 2;
    return { e, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.e);
}

// ---------------- Destination duty lookup ----------------
// Indicative MFN import duty / VAT / FTA-preferential duty for India-origin goods.
// Keyed by ISO-3166 alpha-2 country code + HS code (dotted).
// FTA: if India has a preferential trade deal & the product qualifies, the lower rate applies.

export interface DutyEntry {
  mfnDutyPct: number;        // most-favoured-nation import duty
  vatPct: number;            // VAT / GST at destination
  ftaDutyPct: number | null; // duty if India-origin FTA preference applies, null = no FTA
  ftaName?: string;          // e.g. "India-UAE CEPA", "India-EU GSP"
  notes?: string;
}

export interface CountryInfo {
  code: string;
  name: string;
  riskLevel: "Low" | "Medium" | "High";
  riskNotes: string;
}

export const COUNTRIES: CountryInfo[] = [
  { code: "US", name: "United States",   riskLevel: "Low",    riskNotes: "Stable; GSP for India expired 2019" },
  { code: "DE", name: "Germany",         riskLevel: "Low",    riskNotes: "EU member; strong rule of law" },
  { code: "GB", name: "United Kingdom",  riskLevel: "Low",    riskNotes: "DCTS preferences for India" },
  { code: "AE", name: "United Arab Emirates", riskLevel: "Low", riskNotes: "India-UAE CEPA active since 2022" },
  { code: "SA", name: "Saudi Arabia",    riskLevel: "Low",    riskNotes: "Stable trading partner" },
  { code: "FR", name: "France",          riskLevel: "Low",    riskNotes: "EU member" },
  { code: "NL", name: "Netherlands",     riskLevel: "Low",    riskNotes: "EU member; major EU port hub" },
  { code: "JP", name: "Japan",           riskLevel: "Low",    riskNotes: "India-Japan CEPA active" },
  { code: "SG", name: "Singapore",       riskLevel: "Low",    riskNotes: "India-Singapore CECA active" },
  { code: "AU", name: "Australia",       riskLevel: "Low",    riskNotes: "India-Australia ECTA active since 2022" },
  { code: "CA", name: "Canada",          riskLevel: "Low",    riskNotes: "Stable; bilateral tensions monitor" },
  { code: "CN", name: "China",           riskLevel: "Medium", riskNotes: "Geopolitical & payment-flow checks" },
  { code: "RU", name: "Russia",          riskLevel: "High",   riskNotes: "Sanctions exposure; SWIFT restrictions" },
  { code: "BR", name: "Brazil",          riskLevel: "Medium", riskNotes: "Currency volatility" },
  { code: "ZA", name: "South Africa",    riskLevel: "Medium", riskNotes: "Forex controls & power instability" },
  { code: "NG", name: "Nigeria",         riskLevel: "High",   riskNotes: "USD shortage; payment delays common" },
  { code: "EG", name: "Egypt",           riskLevel: "High",   riskNotes: "FX shortage; LC strongly advised" },
  { code: "TR", name: "Türkiye",         riskLevel: "Medium", riskNotes: "Lira volatility; tariff hikes possible" },
  { code: "BD", name: "Bangladesh",      riskLevel: "Medium", riskNotes: "SAFTA partner; FX reserves tight" },
  { code: "LK", name: "Sri Lanka",       riskLevel: "High",   riskNotes: "Post-default recovery; advance payment preferred" },
  { code: "VN", name: "Vietnam",         riskLevel: "Low",    riskNotes: "ASEAN-India FTA" },
  { code: "MY", name: "Malaysia",        riskLevel: "Low",    riskNotes: "ASEAN-India FTA + bilateral CECA" },
  { code: "ID", name: "Indonesia",       riskLevel: "Medium", riskNotes: "ASEAN-India FTA; complex import permits" },
  { code: "KR", name: "South Korea",     riskLevel: "Low",    riskNotes: "India-Korea CEPA active" },
];

// Duty table — indicative.
// Note: EU members share the EU Common External Tariff; we model DE/FR/NL identically.
const EU_FTA = { ftaName: "EU GSP+ (limited products)" } as const;

export const DUTY_TABLE: Record<string, Record<string, DutyEntry>> = {
  // United States
  US: {
    "1006.30.20": { mfnDutyPct: 1.4, vatPct: 0, ftaDutyPct: null, notes: "USDA inspection required" },
    "1006.30.90": { mfnDutyPct: 1.4, vatPct: 0, ftaDutyPct: null },
    "0901.21.00": { mfnDutyPct: 0,   vatPct: 0, ftaDutyPct: null },
    "0902.30.10": { mfnDutyPct: 0,   vatPct: 0, ftaDutyPct: null },
    "0904.11.10": { mfnDutyPct: 0,   vatPct: 0, ftaDutyPct: null },
    "0904.21.10": { mfnDutyPct: 2.5, vatPct: 0, ftaDutyPct: null },
    "5201.00.15": { mfnDutyPct: 0,   vatPct: 0, ftaDutyPct: null },
    "6109.10.00": { mfnDutyPct: 16.5,vatPct: 0, ftaDutyPct: null, notes: "Section 301 review periodically" },
    "6203.42.00": { mfnDutyPct: 16.6,vatPct: 0, ftaDutyPct: null },
    "4202.22.20": { mfnDutyPct: 17.6,vatPct: 0, ftaDutyPct: null },
    "6403.99.90": { mfnDutyPct: 10,  vatPct: 0, ftaDutyPct: null },
    "7113.19.10": { mfnDutyPct: 5.5, vatPct: 0, ftaDutyPct: null },
    "3004.90.99": { mfnDutyPct: 0,   vatPct: 0, ftaDutyPct: null, notes: "FDA registration mandatory" },
    "0306.17.00": { mfnDutyPct: 0,   vatPct: 0, ftaDutyPct: null, notes: "FDA + DOC anti-dumping checks" },
  },
  // United Arab Emirates — India-UAE CEPA
  AE: {
    "1006.30.20": { mfnDutyPct: 5, vatPct: 0, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "1006.30.90": { mfnDutyPct: 5, vatPct: 0, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "0901.21.00": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "0902.30.10": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "0904.11.10": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "0904.21.10": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "0910.30.10": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "0910.99.13": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "6109.10.00": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "6203.42.00": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "7113.19.10": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA", notes: "Tariff Rate Quota applies" },
    "3004.90.99": { mfnDutyPct: 5, vatPct: 5, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
    "0306.17.00": { mfnDutyPct: 5, vatPct: 0, ftaDutyPct: 0, ftaName: "India-UAE CEPA" },
  },
  // Germany / France / Netherlands — EU Common External Tariff
  DE: {
    "1006.30.20": { mfnDutyPct: 175, vatPct: 7, ftaDutyPct: null, notes: "€175/tonne specific duty (approx %)" },
    "0901.21.00": { mfnDutyPct: 7.5, vatPct: 19, ftaDutyPct: null },
    "0902.30.10": { mfnDutyPct: 0,   vatPct: 19, ftaDutyPct: null },
    "0904.11.10": { mfnDutyPct: 4,   vatPct: 7,  ftaDutyPct: null },
    "0904.21.10": { mfnDutyPct: 9.6, vatPct: 7,  ftaDutyPct: null },
    "5201.00.15": { mfnDutyPct: 0,   vatPct: 19, ftaDutyPct: null },
    "6109.10.00": { mfnDutyPct: 12,  vatPct: 19, ftaDutyPct: 9.6, ...EU_FTA },
    "6203.42.00": { mfnDutyPct: 12,  vatPct: 19, ftaDutyPct: 9.6, ...EU_FTA },
    "4202.22.20": { mfnDutyPct: 3,   vatPct: 19, ftaDutyPct: null },
    "6403.99.90": { mfnDutyPct: 8,   vatPct: 19, ftaDutyPct: null },
    "3004.90.99": { mfnDutyPct: 0,   vatPct: 19, ftaDutyPct: null },
    "0306.17.00": { mfnDutyPct: 12,  vatPct: 7,  ftaDutyPct: null },
  },
  // United Kingdom — DCTS preferences for India
  GB: {
    "1006.30.20": { mfnDutyPct: 0,    vatPct: 0,  ftaDutyPct: null, notes: "DCTS Standard preference" },
    "0901.21.00": { mfnDutyPct: 0,    vatPct: 20, ftaDutyPct: null },
    "0902.30.10": { mfnDutyPct: 0,    vatPct: 20, ftaDutyPct: null },
    "0904.11.10": { mfnDutyPct: 0,    vatPct: 0,  ftaDutyPct: null },
    "0904.21.10": { mfnDutyPct: 4.8,  vatPct: 0,  ftaDutyPct: 0,    ftaName: "UK DCTS Standard" },
    "6109.10.00": { mfnDutyPct: 12,   vatPct: 20, ftaDutyPct: 9.6,  ftaName: "UK DCTS Standard" },
    "6203.42.00": { mfnDutyPct: 12,   vatPct: 20, ftaDutyPct: 9.6,  ftaName: "UK DCTS Standard" },
    "7113.19.10": { mfnDutyPct: 2.5,  vatPct: 20, ftaDutyPct: 0,    ftaName: "UK DCTS Enhanced" },
    "3004.90.99": { mfnDutyPct: 0,    vatPct: 0,  ftaDutyPct: null },
    "0306.17.00": { mfnDutyPct: 12,   vatPct: 0,  ftaDutyPct: 6.4,  ftaName: "UK DCTS Standard" },
  },
  // Australia — India-Australia ECTA
  AU: {
    "1006.30.20": { mfnDutyPct: 0, vatPct: 10, ftaDutyPct: 0, ftaName: "India-Australia ECTA" },
    "0904.11.10": { mfnDutyPct: 0, vatPct: 10, ftaDutyPct: 0, ftaName: "India-Australia ECTA" },
    "6109.10.00": { mfnDutyPct: 5, vatPct: 10, ftaDutyPct: 0, ftaName: "India-Australia ECTA" },
    "6203.42.00": { mfnDutyPct: 5, vatPct: 10, ftaDutyPct: 0, ftaName: "India-Australia ECTA" },
    "3004.90.99": { mfnDutyPct: 0, vatPct: 10, ftaDutyPct: 0, ftaName: "India-Australia ECTA" },
    "0306.17.00": { mfnDutyPct: 0, vatPct: 10, ftaDutyPct: 0, ftaName: "India-Australia ECTA" },
  },
};

export function lookupDuty(countryCode: string, hsCodeDotted: string): DutyEntry | null {
  const c = DUTY_TABLE[countryCode?.toUpperCase()];
  if (!c) return null;
  return c[hsCodeDotted] ?? null;
}

export function findCountryByName(name: string): CountryInfo | null {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  return COUNTRIES.find((c) =>
    c.name.toLowerCase() === n ||
    c.code.toLowerCase() === n ||
    c.name.toLowerCase().includes(n) ||
    n.includes(c.name.toLowerCase())
  ) ?? null;
}

// Mirror EU CET for FR/NL to save typing
DUTY_TABLE.FR = DUTY_TABLE.DE;
DUTY_TABLE.NL = DUTY_TABLE.DE;

// ---------------- Indian export ports ----------------
export interface IndianPort {
  code: string;
  name: string;
  city: string;
  lat: number;
  lon: number;
}

export const INDIAN_PORTS: IndianPort[] = [
  { code: "INNSA", name: "Jawaharlal Nehru (Nhava Sheva)", city: "Mumbai",        lat: 18.9490, lon: 72.9525 },
  { code: "INMUN", name: "Mundra",                          city: "Gujarat",       lat: 22.7397, lon: 69.7039 },
  { code: "INMAA", name: "Chennai",                         city: "Tamil Nadu",    lat: 13.1020, lon: 80.2922 },
  { code: "INCCU", name: "Kolkata",                         city: "West Bengal",   lat: 22.5400, lon: 88.3100 },
  { code: "INCOK", name: "Cochin (Kochi)",                  city: "Kerala",        lat: 9.9667,  lon: 76.2667 },
  { code: "INVTZ", name: "Visakhapatnam",                   city: "Andhra Pradesh",lat: 17.6900, lon: 83.2200 },
  { code: "INIXY", name: "Kandla (Deendayal)",              city: "Gujarat",       lat: 23.0167, lon: 70.2167 },
  { code: "INTUT", name: "Tuticorin (V O Chidambaranar)",   city: "Tamil Nadu",    lat: 8.7600,  lon: 78.2000 },
  { code: "INPAV", name: "Pipavav",                         city: "Gujarat",       lat: 20.9200, lon: 71.5300 },
  { code: "INHZA", name: "Hazira",                          city: "Gujarat",       lat: 21.1167, lon: 72.6167 },
];
