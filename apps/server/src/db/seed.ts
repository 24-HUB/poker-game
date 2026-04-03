import { db } from './index';
import { gachaItems } from './schema';

async function seed() {
  console.log('Seeding gacha items...');

  const items = [
    // R - 14 items
    { name: 'Common Card Back: Sapphire', type: 'card_skin', rarity: 'R', imageUrl: '/assets/r_card_1.png', description: 'A sturdy sapphire card back.' },
    { name: 'Common Card Back: Ruby', type: 'card_skin', rarity: 'R', imageUrl: '/assets/r_card_2.png', description: 'A sturdy ruby card back.' },
    { name: 'Apprentice Avatar', type: 'avatar', rarity: 'R', imageUrl: '/assets/r_avatar_1.png', description: 'An aspiring poker player.' },
    { name: 'Wooden Table', type: 'table_theme', rarity: 'R', imageUrl: '/assets/r_table_1.png', description: 'A classic wooden table.' },
    { name: 'Iron Chip Skin', type: 'card_skin', rarity: 'R', imageUrl: '/assets/r_card_3.png', description: 'Heavy iron chips.' },
    { name: 'Novice Frame', type: 'avatar', rarity: 'R', imageUrl: '/assets/r_avatar_2.png', description: 'Simple frame for beginners.' },
    { name: 'Gray Felt Theme', type: 'table_theme', rarity: 'R', imageUrl: '/assets/r_table_2.png', description: 'Standard gray felt.' },
    { name: 'Wind Elemental Card', type: 'card_skin', rarity: 'R', imageUrl: '/assets/r_card_4.png', description: 'Flickering wind energy.' },
    { name: 'Street Gambler', type: 'avatar', rarity: 'R', imageUrl: '/assets/r_avatar_3.png', description: 'Born in the alleys.' },
    { name: 'Plastic Table', type: 'table_theme', rarity: 'R', imageUrl: '/assets/r_table_3.png', description: 'Cheap and portable.' },
    { name: 'Basic Neon Blue', type: 'card_skin', rarity: 'R', imageUrl: '/assets/r_card_5.png', description: 'Faint blue glow.' },
    { name: 'Silent Shadow', type: 'avatar', rarity: 'R', imageUrl: '/assets/r_avatar_4.png', description: 'He says nothing.' },
    { name: 'Old Tavern Floor', type: 'table_theme', rarity: 'R', imageUrl: '/assets/r_table_4.png', description: 'Smells like history.' },
    { name: 'Bronze Edge Cards', type: 'card_skin', rarity: 'R', imageUrl: '/assets/r_card_6.png', description: 'Slightly metallic.' },

    // SR - 4 items
    { name: 'Starlight Galaxy Skin', type: 'card_skin', rarity: 'SR', imageUrl: '/assets/sr_card_1.png', description: 'Cards that shimmer like the night sky.' },
    { name: 'Golden Dealer Avatar', type: 'avatar', rarity: 'SR', imageUrl: '/assets/sr_avatar_1.png', description: 'The master of the deck.' },
    { name: 'Royal Velvet Table', type: 'table_theme', rarity: 'SR', imageUrl: '/assets/sr_table_1.png', description: 'Luxury purple velvet for high stakes.' },
    { name: 'Dragon Scale Card Back', type: 'card_skin', rarity: 'SR', imageUrl: '/assets/sr_card_2.png', description: 'Tough and mystical.' },

    // SSR - 2 items
    { name: 'Divine Empress Avatar', type: 'avatar', rarity: 'SSR', imageUrl: '/assets/ssr_avatar_1.png', description: 'The goddess of fortune herself.' },
    { name: 'Celestial Temple Table', type: 'table_theme', rarity: 'SSR', imageUrl: '/assets/ssr_table_1.png', description: 'A table floating above the clouds.' },
  ];

  await db.insert(gachaItems).values(items as any);

  console.log('Seeding completed!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
