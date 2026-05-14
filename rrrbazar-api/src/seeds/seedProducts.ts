
require('dotenv').config();
import Schema from '../models';
import { sequelize } from '../models/Schemas';

const { TopupProduct, TopupPackage, Product, Category, ProductCategory } = Schema;

const TOPUP_CATEGORIES = [
    { name: 'Mobile Games', emoji: '📱', slug: 'mobile-games' },
    { name: 'PC Games', emoji: '💻', slug: 'pc-games' },
    { name: 'Gift Cards', emoji: '🎁', slug: 'gift-cards' },
    { name: 'Subscription', emoji: '📅', slug: 'subscription' }
];

const GAMES = [
    { name: 'Free Fire', logo: 'free_fire.png', category: 'Mobile Games' },
    { name: 'PUBG Mobile', logo: 'pubg.png', category: 'Mobile Games' },
    { name: 'Mobile Legends', logo: 'mlbb.png', category: 'Mobile Games' },
    { name: 'Genshin Impact', logo: 'genshin.png', category: 'Mobile Games' },
    { name: 'Call of Duty Mobile', logo: 'codm.png', category: 'Mobile Games' },
    { name: 'Valorant', logo: 'valorant.png', category: 'PC Games' },
    { name: 'Roblox', logo: 'roblox.png', category: 'PC Games' },
    { name: 'Minecraft', logo: 'minecraft.png', category: 'PC Games' },
    { name: 'League of Legends', logo: 'lol.png', category: 'PC Games' },
    { name: 'Clash of Clans', logo: 'coc.png', category: 'Mobile Games' },
    { name: 'Clash Royale', logo: 'clash_royale.png', category: 'Mobile Games' },
    { name: 'Lords Mobile', logo: 'lords_mobile.png', category: 'Mobile Games' },
    { name: '8 Ball Pool', logo: '8ball.png', category: 'Mobile Games' },
    { name: 'Apex Legends', logo: 'apex.png', category: 'PC Games' },
    { name: 'Diablo Immortal', logo: 'diablo.png', category: 'Mobile Games' },
    { name: 'Tower of Fantasy', logo: 'tof.png', category: 'Mobile Games' },
    { name: 'Ni no Kuni', logo: 'ninokuni.png', category: 'Mobile Games' },
    { name: 'Pokemon GO', logo: 'pokemongo.png', category: 'Mobile Games' },
    { name: 'Candy Crush', logo: 'candycrush.png', category: 'Mobile Games' },
    { name: 'Hay Day', logo: 'hayday.png', category: 'Mobile Games' },
    { name: 'Brawl Stars', logo: 'brawlstars.png', category: 'Mobile Games' },
    { name: 'Fortnite', logo: 'fortnite.png', category: 'PC Games' },
    { name: 'FIFA Mobile', logo: 'fifa.png', category: 'Mobile Games' },
    { name: 'NBA 2K Mobile', logo: 'nba2k.png', category: 'Mobile Games' },
    { name: 'Asphalt 9', logo: 'asphalt9.png', category: 'Mobile Games' },
    { name: 'NFS No Limits', logo: 'nfs.png', category: 'Mobile Games' },
    { name: 'Mario Kart Tour', logo: 'mariokart.png', category: 'Mobile Games' },
    { name: 'Among Us', logo: 'amongus.png', category: 'Mobile Games' },
    { name: 'Steam Wallet', logo: 'steam.png', category: 'Gift Cards' },
    { name: 'Google Play Gift Card', logo: 'googleplay.png', category: 'Gift Cards' },
    { name: 'iTunes Gift Card', logo: 'itunes.png', category: 'Gift Cards' },
    { name: 'Netflix Gift Card', logo: 'netflix.png', category: 'Gift Cards' },
    { name: 'Spotify Gift Card', logo: 'spotify.png', category: 'Gift Cards' },
    { name: 'PSN Card', logo: 'psn.png', category: 'Gift Cards' },
    { name: 'Xbox Live Gold', logo: 'xbox.png', category: 'Gift Cards' },
    { name: 'Nintendo eShop', logo: 'nintendo.png', category: 'Gift Cards' },
    { name: 'Razer Gold', logo: 'razer.png', category: 'Gift Cards' },
    { name: 'Garena Shells', logo: 'garena.png', category: 'Gift Cards' },
    { name: 'UniPin Credits', logo: 'unipin.png', category: 'Gift Cards' },
    { name: 'Discord Nitro', logo: 'discord.png', category: 'Subscription' }
];

const ECOMMERCE_PRODUCTS = [
    { name: 'Gaming Mouse', price: 1200, description: 'High precision gaming mouse.' },
    { name: 'Mechanical Keyboard', price: 3500, description: 'RGB mechanical keyboard with blue switches.' },
    { name: 'Gaming Headset', price: 2500, description: '7.1 surround sound gaming headset.' },
    { name: 'Gaming Chair', price: 15000, description: 'Ergonomic gaming chair with lumbar support.' },
    { name: 'Mouse Pad', price: 500, description: 'Large extended mouse pad.' },
    { name: 'Webcam 1080p', price: 2800, description: 'Full HD webcam for streaming.' },
    { name: 'Microphone', price: 4500, description: 'Condenser microphone for high quality audio.' },
    { name: 'Monitor 144Hz', price: 18000, description: '24 inch 144Hz gaming monitor.' },
    { name: 'Graphics Card Holder', price: 800, description: 'ARGB graphics card support bracket.' },
    { name: 'Cooling Pad', price: 1200, description: 'Laptop cooling pad with 5 fans.' }
];

const PACKAGE_TYPES = ['Diamonds', 'UC', 'Crystals', 'Coins', 'Points', 'Credits', 'Tokens'];

async function seedCategories() {
    console.log('→ Seeding categories…');
    const createdCategories: Record<string, any> = {};
    for (const cat of TOPUP_CATEGORIES) {
        const [category] = await Category.findOrCreate({
            where: { name: cat.name },
            defaults: cat
        });
        createdCategories[cat.name] = category;
    }
    return createdCategories;
}

async function seedEcommerceProducts() {
    console.log(`→ Seeding ${ECOMMERCE_PRODUCTS.length} e-commerce products…`);
    for (const p of ECOMMERCE_PRODUCTS) {
        await Product.create({
            name: p.name,
            sale_price: p.price,
            regular_price: (p.price * 1.2).toString(),
            description: p.description,
            quantity: 50,
            is_active: 1,
            image: 'product.png'
        });
    }
}

async function seedProducts(categories: Record<string, any>) {
    console.log(`→ Seeding ${GAMES.length} topup products with packages and categories…`);

    for (const game of GAMES) {
        const product = await TopupProduct.create({
            name: game.name,
            logo: game.logo,
            price: 0,
            is_active: 1,
            isactiveforsale: 1,
            isactivefortopup: 1,
            topuptype: 1,
            serial: 1,
            rules: `Rules for ${game.name} topup.`
        });

        // Link to category
        const category = categories[game.category];
        if (category) {
            await ProductCategory.create({
                topup_product_id: product.id,
                category_id: category.id
            });
        }

        const numPackages = Math.floor(Math.random() * 4) + 3; // 3 to 6
        const type = PACKAGE_TYPES[Math.floor(Math.random() * PACKAGE_TYPES.length)];

        const packages = [];
        for (let i = 1; i <= numPackages; i++) {
            const amount = i * 100 * (Math.floor(Math.random() * 3) + 1);
            const price = amount * 1.2;
            const bprice = price * 0.8;

            packages.push({
                product_id: product.id,
                name: `${amount} ${type}`,
                uc: amount,
                type: 'Direct',
                price: price.toFixed(2),
                bprice: bprice.toFixed(2),
                in_stock: 100,
                serial: i,
                coin_value: Math.floor(amount / 10)
            });
        }

        await TopupPackage.bulkCreate(packages);
        console.log(`  Added ${game.name} (${game.category}) with ${numPackages} packages.`);
    }
}

(async () => {
    try {
        console.log('→ Authenticating DB…');
        await sequelize.authenticate();

        const categories = await seedCategories();
        await seedProducts(categories);
        await seedEcommerceProducts();

        console.log('\n✅ Product & Category seed complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    }
})();
