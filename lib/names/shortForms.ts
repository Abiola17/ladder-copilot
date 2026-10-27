// Known short forms -> the full names they usually stand for.
// Keys and values are lowercase, without accents.
export const SHORT_FORMS: Record<string, string[]> = {
  // Yoruba
  funmi: ["funmilayo", "olufunmilayo", "oluwafunmilayo"],
  funke: ["olufunke", "funmilayo"],
  bisi: ["olubisi", "abisola"],
  tunde: ["babatunde", "olatunde", "ayotunde"],
  tayo: ["omotayo", "adetayo", "oluwatayo"],
  bayo: ["adebayo", "olabayo"],
  sola: ["olusola", "adesola", "oluwasola"],
  shola: ["olusola", "adesola", "oluwasola"],
  yemi: ["oluwayemisi", "adeyemi", "oluyemi"],
  femi: ["olufemi", "oluwafemi"],
  kemi: ["oluwakemi", "olukemi"],
  kunle: ["adekunle", "olakunle"],
  seun: ["oluwaseun", "oluseun"],
  segun: ["olusegun", "oluwasegun"],
  dayo: ["adedayo", "oladayo", "oluwadayo"],
  wale: ["adewale", "olawale", "oluwale"],
  jide: ["olajide", "babajide", "ayojide"],
  lekan: ["olalekan"],
  gbenga: ["oluwagbenga", "adegbenga"],
  dapo: ["oladapo", "adedapo"],
  tobi: ["oluwatobi", "tobiloba"],
  dami: ["oluwadamilare", "damilola", "damilare"],
  // Igbo
  emeka: ["chukwuemeka"],
  ebuka: ["chukwuebuka"],
  nonso: ["chinonso"],
  uche: ["uchechukwu", "uchenna"],
  ada: ["adaeze", "adaora", "adanna", "adaobi"],
  obi: ["obinna"],
  chidi: ["chidiebere", "chidiebube"],
  ify: ["ifeoma", "ifeyinwa"],
  ngo: ["ngozi"],
  // Hausa
  abu: ["abubakar"],
  // English
  tony: ["anthony"],
  bob: ["robert"],
  liz: ["elizabeth"],
  bill: ["william"],
  mike: ["michael"],
  dan: ["daniel"],
  sam: ["samuel", "samson"],
  joe: ["joseph"],
  ben: ["benjamin"],
  chris: ["christopher", "christiana", "christian"],
  tim: ["timothy"],
  vicky: ["victoria"],
  debby: ["deborah"],
};

export function isKnownShortForm(short: string, full: string): boolean {
  return SHORT_FORMS[short]?.includes(full) ?? false;
}
