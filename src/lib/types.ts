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
  | "築地"
  | "六本木"
  | "銀座"
  | "渋谷"
  | "新宿"
  | "京都"
  | "地方"
  | "神奈川";

export interface Restaurant {
  id: string;
  name: string;
  nameEn?: string;
  cuisine: Cuisine;
  priceTier: PriceTier;
  priceLunch?: string;
  priceDinner: string;
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
