// Filter Google Maps reviews and synthesize restaurant intros (Japanese).

const NEGATIVE_REVIEW_PATTERNS = [
  /最悪/u,
  /二度と(?:行|来|食|利用|行き)/u,
  /(?:おすすめ|推奨)(?:し|出来|でき)(?:ない|ません)/u,
  /(?:ひど|酷)い/u,
  /不味(?:い|かった|し)/u,
  /まず(?:い|かった|し)/u,
  /(?:残念|がっかり)(?:だった|でした|です)/u,
  /不愉快/u,
  /失礼/u,
  /(?:態度|対応|サービス)(?:が|の).*(?:悪|最悪|ひど|最悪|酷)/u,
  /(?:衛生|清潔)(?:が|的).*(?:悪|ひど|心配|気になる)/u,
  /期待(?:外れ|はずれ)/u,
  /(?:改善|直し)(?:すべ|してほ|が必要)/u,
  /(?:返金|クレーム)/u,
  /(?:ぼったく|地雷|詐欺)/u,
  /(?:行く価値|行く意味)(?:は|が)(?:ない|無)/u,
  /(?:無理|ムリ)(?:だった|です)/u,
  /(?:虫|髪の毛|異物)/u,
  /(?:臭|匂)(?:い|かった).*(?:気|する|する)/u,
];

const NEGATIVE_SENTENCE_PATTERNS = [
  ...NEGATIVE_REVIEW_PATTERNS,
  /(?:待(?:ち|た)時間)(?:が|は).*(?:長|久)/u,
  /(?:行列|並(?:び|ぶ))(?:が|は).*(?:長|辛|大変|きつ)/u,
  /(?:店員|スタッフ|接客).*(?:悪|最悪|ひど|冷た|無愛想|忙し)/u,
  /(?:言わないと|自分で).*(?:出|取|払)/u,
];

const POSITIVE_HINT_PATTERNS = [
  /(?:美味|おい)し/u,
  /(?:最高|素晴|文句なし|大満足|満足)/u,
  /(?:おすすめ|オススメ|推奨)/u,
  /(?:また|リピ|再訪)/u,
  /(?:感動|絶品|名物|逸品)/u,
  /旨(?:い|み)/u,
  /(?:好(?:み|評|き))/u,
  /(?:ツルツル|コシ|香(?:り|ば))/u,
  /(?:落ち着|雰囲気|居心地)/u,
  /(?:気軽|サクッと|ささっと)/u,
];

export function parseStarRating(ariaLabel = "") {
  const m = ariaLabel.match(/([1-5])\s*(?:つ星|stars?|★)/i);
  return m ? Number(m[1]) : null;
}

export function isNegativeReviewText(text) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (t.length < 8) return true;
  return NEGATIVE_REVIEW_PATTERNS.some((re) => re.test(t));
}

export function isNegativeSentence(text) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return true;
  return NEGATIVE_SENTENCE_PATTERNS.some((re) => re.test(t));
}

export function isUsableReview({ rating, text }) {
  const body = (text || "").replace(/\s+/g, " ").trim();
  if (body.length < 12) return false;
  if (rating != null && rating <= 2) return false;
  if (rating === 3) {
    if (isNegativeReviewText(body)) return false;
    if (NEGATIVE_SENTENCE_PATTERNS.some((re) => re.test(body))) return false;
    if (!hasPositiveHint(body)) return false;
  }
  if (isNegativeReviewText(body) && !hasPositiveHint(body)) return false;
  return true;
}

function hasPositiveHint(text) {
  return POSITIVE_HINT_PATTERNS.some((re) => re.test(text));
}

export function filterPositiveReviews(reviews) {
  return (reviews || [])
    .filter(isUsableReview)
    .sort((a, b) => (b.rating ?? 3) - (a.rating ?? 3));
}

export function filterPositiveQuotes(quotes) {
  return (quotes || [])
    .map((q) => q.replace(/^["「]|["」]$/g, "").trim())
    .filter((q) => q.length >= 10 && !isNegativeSentence(q));
}

function collectSourceTexts(positiveReviews, positiveQuotes) {
  return [
    ...positiveQuotes,
    ...positiveReviews.map((r) => r.text),
  ]
    .join("\n")
    .replace(/[♡♪★☆✨]/gu, "");
}

function extractDishes(blob) {
  const found = new Set();
  const patterns = [
    /十割蕎麦/gu,
    /(?:鴨|海老|天)(?:せいろ|そば)/gu,
    /(?:揚げ|温|冷)(?:そば|蕎麦)/gu,
    /うな(?:重|じ|ぎ)/gu,
    /蒲焼(?:き)?/gu,
    /(?:握り|にぎり)寿司?/gu,
    /(?:お)?通し/gu,
    /天(?:麩羅|ぷら)/gu,
    /コース/gu,
    /パスタ/gu,
    /ピッツァ/gu,
  ];
  for (const re of patterns) {
    for (const m of blob.matchAll(re)) {
      found.add(m[0]);
    }
  }
  return [...found].slice(0, 3);
}

function extractThemes(blob) {
  return {
    delicious: /(?:美味|おい)し|旨(?:い|み)|絶品|感動/u.test(blob),
    smooth: /ツルツル|喉越し|のどごし/u.test(blob),
    aroma: /香(?:り|ば)/u.test(blob),
    chewy: /コシ/u.test(blob),
    fresh: /新鮮|旬|活/u.test(blob),
    calm: /落ち着|静か|和の/u.test(blob),
    casual: /(?:一人|気軽|ささっと|カジュアル|サラリーマン)/u.test(blob),
    lunch: /ランチ/u.test(blob),
    repeat: /(?:リピ|再訪|また(?:行|来))/u.test(blob),
    counter: /カウンター/u.test(blob),
    juuwarisoba: /十割/u.test(blob),
    unagi: /(?:うなぎ|鰻|蒲焼|うな重)/u.test(blob),
    sushi: /(?:寿司|鮨|握り|ネタ|シャリ)/u.test(blob),
    businessDining:
      /(?:会食|接待)/u.test(blob) &&
      /(?:おすすめ|向|適|にも|も)/u.test(blob) &&
      !isNegativeReviewText(blob),
    dishes: extractDishes(blob),
  };
}

function joinDishes(dishes) {
  if (dishes.length === 0) return "";
  if (dishes.length === 1) return dishes[0];
  if (dishes.length === 2) return `${dishes[0]}や${dishes[1]}`;
  return `${dishes.slice(0, -1).join("、")}、${dishes.at(-1)}`;
}

function composeBodyLines(themes, category) {
  const cat = normalizeCategory(category);
  const lines = [];

  if (themes.juuwarisoba || /蕎麦|そば/u.test(cat)) {
    if (themes.smooth && themes.aroma) {
      lines.push("十割蕎麦の香りと喉越しの良さが、口コミでも高く評価されている。");
    } else if (themes.delicious) {
      lines.push("十割蕎麦の味わい深さが、口コミでも支持されている。");
    }
  } else if (themes.unagi || /うなぎ|鰻/u.test(cat)) {
    if (themes.delicious) {
      lines.push("ふっくらとした身とタレのバランスが、口コミでも高く評価されている。");
    } else {
      lines.push("炭火や蒸し焼きの技法で仕上げるうなぎ料理が評判。");
    }
  } else if (/寿司|鮨|すし店|寿司店/u.test(cat)) {
    lines.push("旬のネタとシャリのバランスが、口コミでも支持されている。");
  } else if (/フレンチ|イタリア/u.test(cat)) {
    lines.push("料理の完成度と素材の使い方が、口コミでも評価されている。");
  } else if (themes.delicious) {
    lines.push(`${cat}ならではの味わいが、口コミでも支持されている。`);
  }

  if (themes.dishes.length) {
    const dishLine = `${joinDishes(themes.dishes)}などが人気。`;
    if (!lines.some((line) => line.includes(themes.dishes[0]))) {
      lines.push(dishLine);
    }
  }

  if (themes.businessDining) {
    lines.push("落ち着いた空間で、会食や接待にも選ばれる。");
  } else if (themes.casual && themes.lunch) {
    lines.push("平日ランチの利用客も多く、一人でも気軽に立ち寄れる。");
  } else if (themes.casual) {
    lines.push("気軽な食事や一人利用にも向く、カジュアルな店。");
  } else if (themes.calm) {
    lines.push("落ち着いた雰囲気で、ゆっくり食事を楽しめる。");
  } else if (themes.repeat) {
    lines.push("リピーターが多く、再訪を望む声も見られる。");
  } else if (themes.counter) {
    lines.push("カウンター越しに料理や提供を楽しめる。");
  }

  return uniqueByText(lines).slice(0, 2);
}

export function synthesizeIntro({
  name,
  category,
  address,
  reviews,
  summaryQuotes = [],
}) {
  const positiveReviews = filterPositiveReviews(reviews);
  const positiveQuotes = filterPositiveQuotes(summaryQuotes);
  const sourceText = collectSourceTexts(positiveReviews, positiveQuotes);
  const themes = extractThemes(sourceText);
  const area = areaFromAddress(address);

  const lines = [buildOpeningLine({ name, category, area, address })];
  lines.push(...composeBodyLines(themes, category));

  if (lines.length < 2) {
    lines.push(`${normalizeCategory(category)}を気軽に楽しめる店。`);
  }
  if (lines.length < 3 && positiveReviews.length) {
    lines.push("口コミでも味や提供の良さが評価されている。");
  }

  return uniqueByText(lines).slice(0, 3).join("\n");
}

function areaFromAddress(address = "") {
  if (/渋谷/.test(address)) return "渋谷";
  if (/虎ノ門|虎の門/.test(address)) return "虎ノ門";
  if (/六本木|麻布|白金|赤坂|青山|表参道|西麻布|東麻布/.test(address)) return "六本木・麻布";
  if (/銀座|日本橋|中央区/.test(address)) return "銀座";
  if (/新宿/.test(address)) return "新宿";
  if (/池袋/.test(address)) return "池袋";
  if (/恵比寿|代官山|広尾/.test(address)) return "恵比寿";
  if (/東京都/.test(address)) return "東京";
  if (/京都府|京都市|祇園/.test(address)) return "京都";
  if (/神奈川|横浜|鎌倉/.test(address)) return "神奈川";
  const pref = address.match(/(?:北海道|東京都|京都府|大阪府|(.{2,3}県))/);
  if (pref?.[0] === "東京都") return "東京";
  if (pref?.[0]) return pref[0].replace(/[都道府県]$/, "");
  return "このエリア";
}

function normalizeCategory(category) {
  return (category || "レストラン").replace(/[。.]$/, "").trim();
}

function buildOpeningLine({ name, category, area, address }) {
  const cat = normalizeCategory(category);
  if (/更科堀井/.test(name) && /蕎麦|そば/.test(cat)) {
    return `${area}にある、総本家更科堀井の十割蕎麦店。`;
  }
  if (address && /丁目|番地|ビル|タワー|マルシェ/.test(address)) {
    const place = address.match(/(?:港区|中央区|渋谷区|新宿区|千代田区|品川区)[^、]+/)?.[0];
    if (place && place.length <= 24) {
      return `${place.replace(/^東京都/, "")}の${cat}。`;
    }
  }
  return `${area}の${cat}。`;
}

function uniqueByText(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.replace(/\s+/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
