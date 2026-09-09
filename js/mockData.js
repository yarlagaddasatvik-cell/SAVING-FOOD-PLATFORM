/**
 * NourishNet - Initial Mock Dataset
 * Real-world simulated surplus food donors, NGOs, and initial active batches
 */

const INITIAL_NGOS = [
  {
    id: "ngo-1",
    name: "Robin Hood Army - Metro Chapter",
    type: "Volunteer Food Rescue Network",
    address: "Community Center, Sector 14",
    lat: 28.6139,
    lng: 77.2090,
    contactPerson: "Aarav Sharma",
    phone: "+91 98765 43210",
    capacityServings: 500,
    vehicleType: "Vans & Two-Wheelers",
    rating: 4.9,
    rescuesCount: 1420
  },
  {
    id: "ngo-2",
    name: "Annapurna Shelter & Kitchen",
    type: "Registered Food Bank & Night Shelter",
    address: "42 Heritage Road, Civil Lines",
    lat: 28.6328,
    lng: 77.2197,
    contactPerson: "Dr. Meera Sen",
    phone: "+91 98111 22334",
    capacityServings: 350,
    vehicleType: "Refrigerated Van",
    rating: 4.8,
    rescuesCount: 980
  },
  {
    id: "ngo-3",
    name: "Hope Children's Care Home",
    type: "Orphanage & Day Care",
    address: "Plot 8, Anand Vihar",
    lat: 28.5900,
    lng: 77.2400,
    contactPerson: "Sister Clara",
    phone: "+91 98450 67890",
    capacityServings: 120,
    vehicleType: "Mini Pickup",
    rating: 5.0,
    rescuesCount: 430
  },
  {
    id: "ngo-4",
    name: "Jan Kalyan Roti Bank",
    type: "Community Distribution Drive",
    address: "Railway Colony Block B",
    lat: 28.6500,
    lng: 77.1900,
    contactPerson: "Rajesh Verma",
    phone: "+91 98990 11223",
    capacityServings: 600,
    vehicleType: "2 Mini Trucks",
    rating: 4.7,
    rescuesCount: 2150
  }
];

const INITIAL_DONORS = [
  {
    id: "donor-1",
    name: "Grand Horizon Luxury Buffet",
    category: "Hotel & Banquet",
    address: "Tower A, Aerocity Avenue",
    lat: 28.6180,
    lng: 77.2150,
    contactPerson: "Chef Vikram Kapoor",
    phone: "+91 99887 76655",
    foodSafetyCert: "FSSAI-A10984",
    verified: true
  },
  {
    id: "donor-2",
    name: "Green Valley University Hostel Mess",
    category: "College Hostel / Mess",
    address: "Campus North Gate, Knowledge Park",
    lat: 28.6250,
    lng: 77.2020,
    contactPerson: "Mess Warden S. Roy",
    phone: "+91 97766 55443",
    foodSafetyCert: "FSSAI-U3321",
    verified: true
  },
  {
    id: "donor-3",
    name: "Royal Celebration Caterers",
    category: "Event & Wedding Caterer",
    address: "Grand Lawns, MG Road",
    lat: 28.6050,
    lng: 77.2280,
    contactPerson: "Manoj Chawla",
    phone: "+91 98100 44556",
    foodSafetyCert: "FSSAI-W7789",
    verified: true
  },
  {
    id: "donor-4",
    name: "FreshDaily Supermart & Bakery",
    category: "Supermarket & Bakery",
    address: "Express Mall, Sector 21",
    lat: 28.6410,
    lng: 77.2100,
    contactPerson: "Anita Deshmukh",
    phone: "+91 98220 33445",
    foodSafetyCert: "FSSAI-S5412",
    verified: true
  },
  {
    id: "donor-5",
    name: "CyberTech IT Park Cafeteria",
    category: "Corporate Cafeteria",
    address: "Block 4, Tech Boulevard",
    lat: 28.5850,
    lng: 77.2180,
    contactPerson: "Kunal Ghosh",
    phone: "+91 99112 88776",
    foodSafetyCert: "FSSAI-C9021",
    verified: true
  }
];

// Generate timestamp helper relative to current time
const now = new Date();

const INITIAL_FOOD_LISTINGS = [
  {
    id: "food-101",
    donorId: "donor-1",
    donorName: "Grand Horizon Luxury Buffet",
    donorCategory: "Hotel & Banquet",
    title: "Surplus Gourmet Lunch Buffet (Dal Makhani, Paneer Butter Masala, Pulao, Chapati)",
    foodType: "Cooked Meals",
    storageType: "Hot Insulated Container (>65°C)",
    quantityKg: 35,
    servings: 90,
    dietType: "Vegetarian",
    prepTime: new Date(now.getTime() - 90 * 60000).toISOString(),
    expiryTime: new Date(now.getTime() + 45 * 60000).toISOString(), // 45 mins left (URGENT)
    pickupAddress: "Tower A, Service Gate 3, Aerocity Avenue",
    lat: 28.6180,
    lng: 77.2150,
    status: "available", // available, claimed, collected, delivered
    verificationOtp: "4829",
    claimedBy: null,
    claimedAt: null,
    notes: "Food is kept in commercial warmers. Packaged in sanitized food-grade stainless containers. Bring clean vessels.",
    allergens: "Dairy, Cashews",
    hygieneChecked: true,
    createdAt: new Date(now.getTime() - 30 * 60000).toISOString()
  },
  {
    id: "food-102",
    donorId: "donor-2",
    donorName: "Green Valley University Hostel Mess",
    donorCategory: "College Hostel / Mess",
    title: "Fresh Steamed Rice, Mixed Vegetable Curry & Dal Tadka",
    foodType: "Cooked Meals",
    storageType: "Covered Stainless Steel Drums",
    quantityKg: 60,
    servings: 160,
    dietType: "Vegetarian",
    prepTime: new Date(now.getTime() - 60 * 60000).toISOString(),
    expiryTime: new Date(now.getTime() + 110 * 60000).toISOString(), // ~1.8 hours left
    pickupAddress: "North Gate Hostel Dining Hall, Knowledge Park",
    lat: 28.6250,
    lng: 77.2020,
    status: "available",
    verificationOtp: "7193",
    claimedBy: null,
    claimedAt: null,
    notes: "Untouched bulk food prepared for 500 students, lunch turnout was low due to exams.",
    allergens: "None",
    hygieneChecked: true,
    createdAt: new Date(now.getTime() - 20 * 60000).toISOString()
  },
  {
    id: "food-103",
    donorId: "donor-3",
    donorName: "Royal Celebration Caterers",
    donorCategory: "Event & Wedding Caterer",
    title: "Wedding Feast Leftovers - Biryani, Kofta, Naan, Gulab Jamun",
    foodType: "Cooked Meals",
    storageType: "Chilled & Foil-Wrapped",
    quantityKg: 110,
    servings: 280,
    dietType: "Veg & Non-Veg Packed Separately",
    prepTime: new Date(now.getTime() - 120 * 60000).toISOString(),
    expiryTime: new Date(now.getTime() + 240 * 60000).toISOString(), // 4 hours left
    pickupAddress: "Loading Bay, Grand Lawns, MG Road",
    lat: 28.6050,
    lng: 77.2280,
    status: "available",
    verificationOtp: "3541",
    claimedBy: null,
    claimedAt: null,
    notes: "Massive quantity from reception dinner. High-grade packaging. Ready for urgent distribution.",
    allergens: "Dairy, Gluten, Nuts",
    hygieneChecked: true,
    createdAt: new Date(now.getTime() - 15 * 60000).toISOString()
  },
  {
    id: "food-104",
    donorId: "donor-4",
    donorName: "FreshDaily Supermart & Bakery",
    donorCategory: "Supermarket & Bakery",
    title: "Artisanal Whole Wheat Bread, Buns, Croissants & Sandwiches",
    foodType: "Bakery & Bread",
    storageType: "Room Temp Dry Packaged",
    quantityKg: 22,
    servings: 75,
    dietType: "Vegetarian",
    prepTime: new Date(now.getTime() - 360 * 60000).toISOString(),
    expiryTime: new Date(now.getTime() + 360 * 60000).toISOString(), // 6 hours left
    pickupAddress: "Backdoor Delivery Dock, Express Mall, Sector 21",
    lat: 28.6410,
    lng: 77.2100,
    status: "available",
    verificationOtp: "8920",
    claimedBy: null,
    claimedAt: null,
    notes: "Baked fresh this morning, day-end surplus according to store daily rotation policy.",
    allergens: "Gluten, Yeast",
    hygieneChecked: true,
    createdAt: new Date(now.getTime() - 40 * 60000).toISOString()
  },
  {
    id: "food-105",
    donorId: "donor-5",
    donorName: "CyberTech IT Park Cafeteria",
    donorCategory: "Corporate Cafeteria",
    title: "Packaged Salads, Fruit Bowls & Steamed Veg Momos",
    foodType: "Cold / Salads",
    storageType: "Refrigerated (2°C - 5°C)",
    quantityKg: 18,
    servings: 50,
    dietType: "Vegetarian",
    prepTime: new Date(now.getTime() - 80 * 60000).toISOString(),
    expiryTime: new Date(now.getTime() + 75 * 60000).toISOString(), // 75 mins left
    pickupAddress: "Block 4 Basement Pantry Service Area, Tech Boulevard",
    lat: 28.5850,
    lng: 77.2180,
    status: "available",
    verificationOtp: "6304",
    claimedBy: null,
    claimedAt: null,
    notes: "Individually boxed in bio-degradable meal cartons. Hygienically prepared and chilled.",
    allergens: "Sesame, Soy",
    hygieneChecked: true,
    createdAt: new Date(now.getTime() - 10 * 60000).toISOString()
  }
];

window.NourishData = {
  ngos: INITIAL_NGOS,
  donors: INITIAL_DONORS,
  foodListings: INITIAL_FOOD_LISTINGS
};
