import { db } from './index';
import { gachaItems } from './schema';

async function seed() {
  console.log('Seeding gacha items...');

  const items = [
    // R - 14 items
    { id: 'r001', name: 'Common Card Back: Sapphire', type: 'card_skin', rarity: 'R', imageUrl: '/assets/r_card_1.png', description: 'A sturdy sapphire card back.' },
    { id: 'r002', name: 'Common Card Back: Ruby', type: 'card_skin', rarity: 'R', imageUrl: '/assets/r_card_2.png', description: 'A sturdy ruby card back.' },
    { id: 'r003', name: 'Apprentice Avatar', type: 'avatar', rarity: 'R', imageUrl: '/assets/r_avatar_1.png', description: 'An aspiring poker player.' },
    { id: 'r004', name: 'Wooden Table', type: 'table_theme', rarity: 'R', imageUrl: '/assets/r_table_1.png', description: 'A classic wooden table.' },
    { id: 'r005', name: 'Iron Chip Skin', type: 'card_skin', rarity: 'R', imageUrl: '/assets/r_card_3.png', description: 'Heavy iron chips.' },
    { id: 'r006', name: 'Novice Frame', type: 'avatar', rarity: 'R', imageUrl: '/assets/r_avatar_2.png', description: 'Simple frame for beginners.' },
    { id: 'r007', name: 'Gray Felt Theme', type: 'table_theme', rarity: 'R', imageUrl: '/assets/r_table_2.png', description: 'Standard gray felt.' },
    { id: 'r008', name: 'Wind Elemental Card', type: 'card_skin', rarity: 'R', imageUrl: '/assets/r_card_4.png', description: 'Flickering wind energy.' },
    { id: 'r009', name: 'Street Gambler', type: 'avatar', rarity: 'R', imageUrl: '/assets/r_avatar_3.png', description: 'Born in the alleys.' },
    { id: 'r010', name: 'Plastic Table', type: 'table_theme', rarity: 'R', imageUrl: '/assets/r_table_3.png', description: 'Cheap and portable.' },
    { id: 'r011', name: 'Basic Neon Blue', type: 'card_skin', rarity: 'R', imageUrl: '/assets/r_card_5.png', description: 'Faint blue glow.' },
    { id: 'r012', name: 'Silent Shadow', type: 'avatar', rarity: 'R', imageUrl: '/assets/r_avatar_4.png', description: 'He says nothing.' },
    { id: 'r013', name: 'Old Tavern Floor', type: 'table_theme', rarity: 'R', imageUrl: '/assets/r_table_4.png', description: 'Smells like history.' },
    { id: 'r014', name: 'Bronze Edge Cards', type: 'card_skin', rarity: 'R', imageUrl: '/assets/r_card_6.png', description: 'Slightly metallic.' },

    // SR - 4 items
    { id: 'sr001', name: 'Starlight Galaxy Skin', type: 'card_skin', rarity: 'SR', imageUrl: '/assets/sr_card_1.png', description: 'Cards that shimmer like the night sky.' },
    { id: 'sr002', name: 'Golden Dealer Avatar', type: 'avatar', rarity: 'SR', imageUrl: '/assets/sr_avatar_1.png', description: 'The master of the deck.' },
    { id: 'sr003', name: 'Royal Velvet Table', type: 'table_theme', rarity: 'SR', imageUrl: '/assets/sr_table_1.png', description: 'Luxury purple velvet for high stakes.' },
    { id: 'sr004', name: 'Dragon Scale Card Back', type: 'card_skin', rarity: 'SR', imageUrl: '/assets/sr_card_2.png', description: 'Tough and mystical.' },

    // SSR - 2 items
    { id: 'ssr001', name: 'Divine Empress Avatar', type: 'avatar', rarity: 'SSR', imageUrl: '/assets/ssr_avatar_1.png', description: 'The goddess of fortune herself.' },
    { id: 'ssr002', name: 'Celestial Temple Table', type: 'table_theme', rarity: 'SSR', imageUrl: '/assets/ssr_table_1.png', description: 'A table floating above the clouds.' },
  ];

  await db.insert(gachaItems).values(items as any);

  console.log('Seeding completed!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
