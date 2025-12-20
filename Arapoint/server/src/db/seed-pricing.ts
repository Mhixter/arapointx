import { db } from '../config/database';
import { servicePricing } from './schema';
import { sql } from 'drizzle-orm';

const pricingRecords = [
  { serviceType: 'nin_slip_information', serviceName: 'NIN Slip Information', price: '150.00', description: 'Get NIN slip information only', isActive: true },
  { serviceType: 'nin_slip_regular', serviceName: 'NIN Slip Regular', price: '180.00', description: 'Regular NIN slip printing', isActive: true },
  { serviceType: 'nin_slip_standard', serviceName: 'NIN Slip Standard', price: '180.00', description: 'Standard NIN slip with enhanced features', isActive: true },
  { serviceType: 'nin_slip_premium', serviceName: 'NIN Slip Premium', price: '200.00', description: 'Premium NIN slip with all features', isActive: true },
  { serviceType: 'nin_phone', serviceName: 'NIN By Phone', price: '180.00', description: 'Retrieve NIN using phone number', isActive: true },
  { serviceType: 'nin_tracking', serviceName: 'NIN With Tracking ID', price: '250.00', description: 'Verify NIN using NIMC tracking ID', isActive: true },
  { serviceType: 'bvn_verification', serviceName: 'BVN Verification', price: '200.00', description: 'Download your BVN slip', isActive: true },
  { serviceType: 'ipe_clearance', serviceName: 'IPE Clearance', price: '1000.00', description: 'Clear IPE errors and enrollment issues', isActive: true },
  { serviceType: 'validation_nin', serviceName: 'NIN Validation', price: '1000.00', description: 'Record validation and corrections', isActive: true },
  { serviceType: 'jamb_result', serviceName: 'JAMB Result', price: '500.00', description: 'Check JAMB examination results', isActive: true },
  { serviceType: 'waec_result', serviceName: 'WAEC Result', price: '500.00', description: 'Check WAEC examination results', isActive: true },
  { serviceType: 'waec_scratch_card', serviceName: 'WAEC Scratch Card', price: '4000.00', description: 'Buy WAEC result checker scratch card', isActive: true },
  { serviceType: 'neco_result', serviceName: 'NECO Result', price: '500.00', description: 'Check NECO examination results', isActive: true },
  { serviceType: 'neco_scratch_card', serviceName: 'NECO Scratch Card', price: '1500.00', description: 'Buy NECO result checker scratch card', isActive: true },
  { serviceType: 'nabteb_result', serviceName: 'NABTEB Result', price: '500.00', description: 'Check NABTEB examination results', isActive: true },
  { serviceType: 'nbais_result', serviceName: 'NBAIS Result', price: '500.00', description: 'Check NBAIS examination results', isActive: true },
  { serviceType: 'cac_business_name', serviceName: 'CAC Business Name', price: '25000.00', description: 'Register business name with CAC', isActive: true },
  { serviceType: 'cac_limited_company', serviceName: 'CAC Limited Company', price: '35000.00', description: 'Register limited liability company', isActive: true },
  { serviceType: 'cac_incorporated_trustees', serviceName: 'CAC Incorporated Trustees', price: '55000.00', description: 'Register incorporated trustees/NGO', isActive: true },
  { serviceType: 'airtime_to_cash', serviceName: 'Airtime to Cash', price: '0.00', description: 'Convert airtime to wallet balance', isActive: true },
  { serviceType: 'nin_personalization', serviceName: 'NIN Personalization', price: '1500.00', description: 'Customize NIN identity data', isActive: true },
  { serviceType: 'birth_attestation', serviceName: 'Birth Attestation', price: '2000.00', description: 'NPC Birth Certificate attestation', isActive: true },
  { serviceType: 'waec_pin', serviceName: 'WAEC PIN', price: '4000.00', description: 'WAEC examination PIN - Instant Delivery', isActive: true },
  { serviceType: 'neco_pin', serviceName: 'NECO PIN', price: '1500.00', description: 'NECO examination PIN - Instant Delivery', isActive: true },
  { serviceType: 'nabteb_pin', serviceName: 'NABTEB PIN', price: '3000.00', description: 'NABTEB examination PIN - Instant Delivery', isActive: true },
  { serviceType: 'nbais_pin', serviceName: 'NBAIS PIN', price: '2500.00', description: 'NBAIS examination PIN - Instant Delivery', isActive: true },
];

export async function seedPricing() {
  console.log('Seeding service pricing records...');
  
  for (const record of pricingRecords) {
    try {
      await db.insert(servicePricing).values(record).onConflictDoNothing();
    } catch (error: any) {
      console.log(`Skipping ${record.serviceType}: ${error.message}`);
    }
  }
  
  console.log('Service pricing seeding complete.');
}
