import axios from 'axios';

/**
 * Shopee Internal API helper
 * Gọi trực tiếp API nội bộ của Shopee để lấy giá Mobile chính xác,
 * bao gồm cả giá Flash Sale và một số thông tin voucher.
 */

const SHOPEE_MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/20G75 ' +
  'Shopee/3.25.10 (iPhone; iOS 16.6; Scale/3.00)';

export interface ShopeeItemData {
  itemId: string;
  shopId: string;
  name: string | null;
  price: number | null;         // Giá bán hiện tại (VND)
  originalPrice: number | null; // Giá gốc trước giảm (VND)
  discountPercent: number | null;
  currency: string;
  imageUrl: string | null;
  stock: number | null;
  stockStatus: 'in_stock' | 'out_of_stock' | 'unknown';
  flashSalePrice: number | null; // Giá Flash Sale nếu đang diễn ra
}

/**
 * Trích xuất shopId và itemId từ URL Shopee VN
 * Hỗ trợ các định dạng URL:
 * - https://shopee.vn/product-name-i.SHOPID.ITEMID
 * - https://shopee.vn/shop/SHOPID/product/ITEMID
 * - https://shopee.vn/-i.SHOPID.ITEMID
 */
export function extractShopeeIds(url: string): { shopId: string; itemId: string } | null {
  // Pattern 1: i.SHOPID.ITEMID (most common)
  const dotPattern = url.match(/[.-]i\.(\d+)\.(\d+)/);
  if (dotPattern) {
    return { shopId: dotPattern[1], itemId: dotPattern[2] };
  }

  // Pattern 2: /shop/SHOPID/product/ITEMID
  const shopPattern = url.match(/\/shop\/(\d+)\/product\/(\d+)/);
  if (shopPattern) {
    return { shopId: shopPattern[1], itemId: shopPattern[2] };
  }

  // Pattern 3: ?itemid=ITEMID&shopid=SHOPID (query params)
  const urlObj = new URL(url);
  const itemId = urlObj.searchParams.get('itemid');
  const shopId = urlObj.searchParams.get('shopid');
  if (itemId && shopId) {
    return { shopId, itemId };
  }

  return null;
}

/**
 * Gọi Shopee API v4 để lấy thông tin sản phẩm
 * Trả về giá chính xác như trên App Mobile Shopee
 */
export async function fetchShopeeItemData(
  shopId: string,
  itemId: string
): Promise<ShopeeItemData | null> {
  try {
    const apiUrl = `https://shopee.vn/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`;

    const response = await axios.get<{ data?: ShopeeApiItem; error?: number }>(apiUrl, {
      headers: {
        'User-Agent': SHOPEE_MOBILE_UA,
        Referer: `https://shopee.vn/product/${shopId}/${itemId}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
      timeout: 10000,
    });

    const item = response.data?.data;
    if (!item) {
      console.log(`[Shopee API] No data returned for shopId=${shopId}, itemId=${itemId}`);
      return null;
    }

    // Shopee lưu giá dưới dạng "price unit" = giá VND * 100000
    const PRICE_DIVIDER = 100000;

    const currentPrice = item.price_min != null ? item.price_min / PRICE_DIVIDER : null;
    const origPrice = item.price_min_before_discount != null
      ? item.price_min_before_discount / PRICE_DIVIDER
      : null;

    // Flash sale price (nếu đang diễn ra Flash Sale)
    let flashSalePrice: number | null = null;
    if (item.flash_sale && item.flash_sale.price != null) {
      flashSalePrice = item.flash_sale.price / PRICE_DIVIDER;
    }

    // Discount percent
    const discountPercent = item.raw_discount ?? null;

    // Stock status
    let stockStatus: 'in_stock' | 'out_of_stock' | 'unknown' = 'unknown';
    if (typeof item.stock === 'number') {
      stockStatus = item.stock > 0 ? 'in_stock' : 'out_of_stock';
    } else if (item.item_status) {
      stockStatus = item.item_status === 'normal' ? 'in_stock' : 'out_of_stock';
    }

    // Use flash sale price if active, else current price
    const finalPrice = flashSalePrice ?? currentPrice;

    // Image
    const imageUrl = item.image
      ? `https://down-vn.img.susercontent.com/file/${item.image}`
      : null;

    console.log(
      `[Shopee API] shopId=${shopId} itemId=${itemId}: price=${finalPrice} VND` +
      (flashSalePrice ? ` (Flash Sale: ${flashSalePrice})` : '') +
      `, stock=${stockStatus}`
    );

    return {
      itemId,
      shopId,
      name: item.name ?? null,
      price: finalPrice,
      originalPrice: origPrice,
      discountPercent,
      currency: 'VND',
      imageUrl,
      stock: item.stock ?? null,
      stockStatus,
      flashSalePrice,
    };
  } catch (error) {
    console.error(`[Shopee API] Failed to fetch data for shopId=${shopId}, itemId=${itemId}:`, error);
    return null;
  }
}

// ---- Internal Shopee API type definitions ----
interface ShopeeApiItem {
  itemid?: number;
  shopid?: number;
  name?: string;
  price?: number;           // giá niêm yết * 100000
  price_min?: number;       // giá thấp nhất (variant) * 100000
  price_max?: number;
  price_min_before_discount?: number;
  price_max_before_discount?: number;
  raw_discount?: number;    // % giảm giá
  stock?: number;
  item_status?: string;     // 'normal' = có hàng
  image?: string;           // image hash
  images?: string[];
  flash_sale?: {
    price?: number;         // giá flash sale * 100000
    start_time?: number;
    end_time?: number;
    stock?: number;
  };
}
