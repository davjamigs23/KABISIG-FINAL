import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// ESM-safe __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Official = {
  bgy: string;
  name: string;
  email: string;
  role: 2 | 3; // 2 = Chairperson, 3 = Official
  pos: 'SK Chairperson' | 'SK Kagawad' | 'SK Secretary' | 'SK Treasurer' | null;
};

// Full data from SK Directory PDF (27 Barangays)
// Only including entries WITH valid emails (skipping blanks per instructions)
const officials: Official[] = [
  // ABELLA
  { bgy: 'Abella', name: 'Shinri Joven Relucano', email: 'shinrijrelucano@gmail.com', role: 2, pos: null },
  { bgy: 'Abella', name: 'Ninna Nasayao', email: 'ninnasayao@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Abella', name: 'John Paul SG. Nocillado', email: 'johnpaulonocillado3@gmail.com', role: 3, pos: 'SK Treasurer' },

  // BAGUMBAYAN NORTE
  { bgy: 'Bagumbayan Norte', name: 'Florabelle P. Paligar', email: 'paligarflorabelle22@gmail.com', role: 2, pos: null },
  { bgy: 'Bagumbayan Norte', name: 'Mark Daniel B. Albia', email: 'albiadaniel025@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Bagumbayan Norte', name: 'Khlarisse Victoria B. Flores', email: 'khlarissevictoria.flores@gmail.com', role: 3, pos: 'SK Treasurer' },

  // BAGUMBAYAN SUR
  { bgy: 'Bagumbayan Sur', name: 'Patricia Mae P. Dimabayao', email: 'dimabayaop@gmail.com', role: 2, pos: null },
  { bgy: 'Bagumbayan Sur', name: 'Angelo B. Gamayot', email: 'angelogamayot54321@gmail.com', role: 3, pos: 'SK Treasurer' },

  // BALATAS
  { bgy: 'Balatas', name: 'Joseph S. Ibasco, Jr.', email: 'josephibasco1@gmail.com', role: 2, pos: null },
  { bgy: 'Balatas', name: 'Andrei James O. Casidsid', email: 'casidsidandreijames@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Balatas', name: 'Mark Christian S. Cano', email: 'markchristian.cano98@gmail.com', role: 3, pos: 'SK Treasurer' },

  // CALAUAG
  { bgy: 'Calauag', name: 'Patrick B. Bernas', email: 'patbernas1@gmail.com', role: 2, pos: null },
  { bgy: 'Calauag', name: 'Mary Rose Dacuro', email: 'marycpaintransit@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Calauag', name: 'Marvin B. De Los Reyes', email: 'mabindelre@gmail.com', role: 3, pos: 'SK Treasurer' },

  // CARARAYAN (Secretary email blank - skipped)
  { bgy: 'Cararayan', name: 'Jeffrey V. Bilbao', email: 'jbilbao@gbox.ncf.edu.ph', role: 2, pos: null },
  { bgy: 'Cararayan', name: 'Luiselle Alliana G. Hernandez', email: 'luiselleallianahernandez@gmail.com', role: 3, pos: 'SK Treasurer' },

  // CAROLINA
  { bgy: 'Carolina', name: 'Sharmaine Oroy Bacay', email: 'sharmaineoroybacay@gmail.com', role: 2, pos: null },
  { bgy: 'Carolina', name: 'Michael P. Naveda', email: 'michaelnaveda964@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Carolina', name: 'Ana Mae O. Sales', email: 'salesanamaeorpia@gmail.com', role: 3, pos: 'SK Treasurer' },

  // CONCEPCION GRANDE
  { bgy: 'Concepcion Grande', name: 'Marinel Mae M. Chica', email: 'marinelmaechica@gmail.com', role: 2, pos: null },
  { bgy: 'Concepcion Grande', name: 'Shamir Alwen Soriano', email: 'soriano.shamiralwen2@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Concepcion Grande', name: 'Angienel Gojit', email: 'angienelboneogojit@gmail.com', role: 3, pos: 'SK Treasurer' },

  // CONCEPCION PEQUEÑA
  { bgy: 'Concepcion Pequeña', name: 'Maica DC. Imperial', email: 'maicaimperial13@gmail.com', role: 2, pos: null },
  { bgy: 'Concepcion Pequeña', name: 'Joshua P. Nito', email: 'nitojoshua96@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Concepcion Pequeña', name: 'Gladys Joy R. Borlaza', email: 'borlazagladysjoy@gmail.com', role: 3, pos: 'SK Treasurer' },

  // DAYANGDANG
  { bgy: 'Dayangdang', name: 'James Joshua E. Manlangit', email: 'jamesjoshuamanlangit@gmail.com', role: 2, pos: null },
  { bgy: 'Dayangdang', name: 'Rizza Janine Mylene G. Soriano', email: 'sorianojanine682@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Dayangdang', name: 'Brazen Kaille A. Mayuyu', email: 'brazenkaille0711@gmail.com', role: 3, pos: 'SK Treasurer' },

  // DEL ROSARIO
  { bgy: 'Del Rosario', name: 'Cedrick Azaña', email: 'azanacedrick@gmail.com', role: 2, pos: null },
  { bgy: 'Del Rosario', name: 'Rose Ann Gonzales', email: 'roseannbg1@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Del Rosario', name: 'Jennyvic Pribaldos', email: 'pribaldosjennyvie@gmail.com', role: 3, pos: 'SK Treasurer' },

  // DINAGA
  { bgy: 'Dinaga', name: 'Jose Maria Dela Cruz', email: 'josemaria.delacruz@cbsua.edu.ph', role: 2, pos: null },
  { bgy: 'Dinaga', name: 'Katrina Joy M. Ramirez', email: 'katrinaramirez46@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Dinaga', name: 'Ylainne D. Hernandez', email: 'hernandezylainne012@gmail.com', role: 3, pos: 'SK Treasurer' },

  // IGUALDAD
  { bgy: 'Igualdad', name: 'Jamaica B. Soñas', email: 'sonasjamaica@gmail.com', role: 2, pos: null },
  { bgy: 'Igualdad', name: 'Wilson DL. Mayao Jr.', email: 'wilspnmayao9@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Igualdad', name: 'Francine Noelle Cedo Taguilid', email: 'francinenoelletaguilid@gmail.com', role: 3, pos: 'SK Treasurer' },

  // LERMA
  { bgy: 'Lerma', name: 'Ma. Angelica Pujado', email: 'angiepujado@gmail.com', role: 2, pos: null },
  { bgy: 'Lerma', name: 'Shaira Felicia Acosta', email: 'scacosta14@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Lerma', name: 'Christian Ner Joven', email: 'christianner314@gmail.com', role: 3, pos: 'SK Treasurer' },

  // LIBOTON
  { bgy: 'Liboton', name: 'Don Vallen Colarina', email: 'doncallen30@gmail.com', role: 2, pos: null },
  { bgy: 'Liboton', name: 'Jhomanette G. Rocolcol', email: 'manetterocolcol113@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Liboton', name: 'Gabriel Dave Ibasco', email: 'gabrieldave.ibasco@gmail.com', role: 3, pos: 'SK Treasurer' },

  // MABOLO
  { bgy: 'Mabolo', name: 'Marlon A. Casilao', email: 'loncasilao@gmail.com', role: 2, pos: null },
  { bgy: 'Mabolo', name: 'John Rafael P. San Jose', email: 'johnrafaelsanjose154@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Mabolo', name: 'Jenlyn P. Macasinag', email: 'jenlynmacasinag@gmail.com', role: 3, pos: 'SK Treasurer' },

  // PACOL
  { bgy: 'Pacol', name: 'Rosary D. Diaz', email: 'saryddiaz@gmail.com', role: 2, pos: null },
  { bgy: 'Pacol', name: 'Annilou M. Colegio', email: 'anniloucolegioo@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Pacol', name: 'Maria Katleen B. Villanueva', email: 'villanuevamariakatleen@gmail.com', role: 3, pos: 'SK Treasurer' },

  // PANICUASON (Secretary & Treasurer emails blank - skipped)
  { bgy: 'Panicuason', name: 'John Mark P. Cosa', email: 'cosajohnmark780@gmail.com', role: 2, pos: null },

  // PEÑAFRANCIA
  { bgy: 'Peñafrancia', name: 'Crystal Rose Ofemaria', email: 'thalofemaria129@gmail.com', role: 2, pos: null },
  { bgy: 'Peñafrancia', name: 'John Dale Dominic Verdadero', email: 'jddrayalaverdadero@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Peñafrancia', name: 'Lynell Clarenz Braganza', email: 'lynellclarenz70@gmail.com', role: 3, pos: 'SK Treasurer' },

  // SABANG (Secretary email blank - skipped)
  { bgy: 'Sabang', name: 'John Nino J. Realda', email: 'johnrealda@gmail.com', role: 2, pos: null },
  { bgy: 'Sabang', name: 'Riziel R. Lasangue', email: 'lasangueriziel@gmail.com', role: 3, pos: 'SK Treasurer' },

  // SAN FELIPE
  { bgy: 'San Felipe', name: 'Nikka O. Navera', email: 'nikkanavera19@gmail.com', role: 2, pos: null },
  { bgy: 'San Felipe', name: 'Hyacine Kische N. Estrella', email: 'esthyacine@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'San Felipe', name: 'Vincent John G. Morandarte', email: 'vjmorandarte@gmail.com', role: 3, pos: 'SK Treasurer' },

  // SAN ISIDRO
  { bgy: 'San Isidro', name: 'Christopher Ken Labrador Mendoza', email: 'mchristopherken@gmail.com', role: 2, pos: null },
  { bgy: 'San Isidro', name: 'Venus Aira C. De Quiros', email: 'venusairadequiros@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'San Isidro', name: 'Anthony M. Esteva', email: 'aesteva191@gmail.com', role: 3, pos: 'SK Treasurer' },

  // SAN FRANCISCO (Secretary email blank - skipped)
  { bgy: 'San Francisco', name: 'Zaldy D. Bragais Jr.', email: 'zaldybragais@gmail.com', role: 2, pos: null },

  // STA. CRUZ
  { bgy: 'Sta. Cruz', name: 'Jefson Romeo B. Felix', email: 'thejefsoooo@gmail.com', role: 2, pos: null },
  { bgy: 'Sta. Cruz', name: 'Zaira Constantino', email: 'constantinozaira1021@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Sta. Cruz', name: 'Zephania Joemae Torres', email: 'zephaniatorres123@gmail.com', role: 3, pos: 'SK Treasurer' },

  // TABUCO
  { bgy: 'Tabuco', name: 'Christobal Salvador Cambe', email: 'christobalcambe@gmail.com', role: 2, pos: null },
  { bgy: 'Tabuco', name: 'Ma. Crystal Joyce B. Cruz', email: 'ma.crystaljoyce.cruz@unc.edu.ph', role: 3, pos: 'SK Secretary' },
  { bgy: 'Tabuco', name: 'Daniel M. Rañola', email: 'danielranola@gmail.com', role: 3, pos: 'SK Treasurer' },

  // TINAGO
  { bgy: 'Tinago', name: 'Kristin Ros Maleniza', email: 'kr6511383@gmail.com', role: 2, pos: null },
  { bgy: 'Tinago', name: 'Gwen Garcera', email: 'gwengarcera09@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Tinago', name: 'Zevilyn S. Briones', email: 'zevilynbriones@gmail.com', role: 3, pos: 'SK Treasurer' },

  // TRIANGULO
  { bgy: 'Triangulo', name: 'Jyla Mir P. Dangca', email: 'dangca.jylamir@gmail.com', role: 2, pos: null },
  { bgy: 'Triangulo', name: 'Mary Joy LL. Dormido', email: 'joydormido.sk@gmail.com', role: 3, pos: 'SK Secretary' },
  { bgy: 'Triangulo', name: 'Christine Faith S. Ortimero', email: 'chrstnfthortnr@gmail.com', role: 3, pos: 'SK Treasurer' },
];

// Infer sex from name (simplified heuristic)
function inferSex(name: string): 'Male' | 'Female' {
  const first = (name.split(/[\s,]+/)[0] || '').toLowerCase();
  const femaleIndicators = ['a', 'ia', 'lyn', 'ne', 'elle', 'joy', 'rose', 'mae', 'sharmaine', 'marinel', 'maica', 'jamaica', 'jyla', 'nina', 'ninna', 'kristin', 'zaira', 'zephania', 'zevilyn', 'gwen', 'christine', 'mary', 'joy', 'ma.', 'khlarisse', 'anna', 'kathleen'];
  if (femaleIndicators.some(ind => first.includes(ind.replace('.', '')) || name.toLowerCase().includes(ind))) {
    return 'Female';
  }
  return 'Male';
}

async function seed() {
  console.log('🚀 Starting safe bulk provisioning from SK Directory PDF...\n');

  // Pre-load all barangays once (optimization)
  const { data: allBgy, error: bgyErr } = await supabase.from('barangay').select('id, name');
  if (bgyErr || !allBgy) {
    console.error('❌ Failed to load barangays:', bgyErr?.message);
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const official of officials) {
    // Normalize barangay name matching
    const bgy = allBgy.find(b =>
      b.name.toLowerCase().trim() === official.bgy.toLowerCase().trim() ||
      b.name.toLowerCase().trim().replace('ñ', 'n') === official.bgy.toLowerCase().trim().replace('ñ', 'n')
    );

    if (!bgy) {
      console.error(`❌ Barangay not found: ${official.bgy}`);
      failed++;
      continue;
    }

    // Check if user already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', official.email)
      .maybeSingle();

    if (existing) {
      console.log(`⏭️  Skipped (already exists): ${official.email}`);
      skipped++;
      continue;
    }

    // Create Auth user via Admin API (safe)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: official.email,
      password: 'Kabisig2026!',
      email_confirm: true,
      user_metadata: {
        full_name: official.name,
        official_role: official.pos,
        setup_completed: false,
      },
    });

    if (authError || !authData.user) {
      console.error(`❌ Auth failed for ${official.email}: ${authError?.message}`);
      failed++;
      continue;
    }

    const userId = authData.user.id;

    // Insert into public.users
    const { error: userErr } = await supabase.from('users').insert({
      id: userId,
      tenant_id: bgy.id,
      email: official.email,
      full_name: official.name,
      role_id: official.role,
      status: 'pending',
    });

    if (userErr) {
      console.error(`❌ public.users failed for ${official.email}: ${userErr.message}`);
      failed++;
      continue;
    }

    // Insert into resident_profile
    const { error: rpErr } = await supabase.from('resident_profile').insert({
      user_id: userId,
      tenant_id: bgy.id,
      birthdate: '2000-01-01',
      sex: inferSex(official.name),
      address: `Zone ${Math.floor(Math.random() * 10) + 1}, ${official.bgy}, Naga City`,
      educational_status: 'College',
      employment_status: 'Unemployed',
      verification_status: 'not_submitted',
    });

    if (rpErr) {
      console.error(`⚠️  resident_profile failed for ${official.email}: ${rpErr.message}`);
      // Not fatal - auth+users already created
    }

    console.log(`✅ Created: ${official.name} [${official.pos || 'SK Chairperson'}] @ ${official.bgy}`);
    created++;
  }

  console.log(`\n========================================`);
  console.log(`📊 PROVISIONING SUMMARY`);
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ⏭️  Skipped (already existed): ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`========================================`);
  console.log(`🔑 Default password for all: Kabisig2026!`);
}

seed().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});