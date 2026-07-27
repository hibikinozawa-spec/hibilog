export type Cuisine =
  | "和食"
  | "鮨"
  | "肉"
  | "イタリアン"
  | "フレンチ"
  | "その他";

export type PriceTier = "casual" | "middle" | "executive";

export type Scene =
  | "会食"
  | "個室"
  | "カジュアル"
  | "とっておき"
  | "記念日"
  | "コスパ"
  | "接待"
  | "デート";

export type Area =
  | "東京"
  | "六本木"
  | "虎ノ門"
  | "銀座"
  | "渋谷"
  | "新宿"
  | "西麻布"
  | "京都"
  | "地方"
  | "神奈川"
  | "大阪"
  | "福岡"
  | "神戸"
  | "名古屋"
  | "仙台"
  | "広島"
  | "北海道"
  | "和歌山"
  | "鹿児島"
  | "埼玉"
  | "富山"
  | "長野"
  | "静岡"
  | "石川"
  | "千葉"
  | "大分"
  | "愛媛"
  | "奈良"
  | "鳥取"
  | "滋賀"
  | "岐阜"
  | "福井"
  | "佐賀"
  | "島根"
  | "沖縄"
  | "高知"
  | "岡山"
  | "茨城"
  | "福島"
  | "宮崎"
  | "山形"
  | "山口";

export interface Restaurant {
  id: string;
  name: string;
  nameEn?: string;
  cuisine: Cuisine;
  priceTier: PriceTier;
  priceLunch?: string;
  priceDinner: string;
  /** Google Maps 1人あたりの下限（円）。ソート用。 */
  priceMin?: number;
  /** Google Maps 1人あたりの上限（円）。 */
  priceMax?: number;
  scenes: Scene[];
  area: Area;
  address: string;
  nearestStation: string;
  lat: number;
  lng: number;
  googleMapsUrl: string;
  googlePlaceQuery: string;
  image: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  description: string;
  privateRoom: boolean;
  capacity?: number;
  listSource: string;
}
