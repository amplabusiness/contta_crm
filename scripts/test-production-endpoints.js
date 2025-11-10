/**
 * test-production-endpoints.js
 * 
 * Testa os 3 endpoints de IA em PRODUÇÃO (Vercel)
 * 
 * USO: node scripts/test-production-endpoints.js
 */

const PRODUCTION_URL = 'https://contta-nky9i21af-sergio-carneiro-leaos-projects.vercel.app';

console.log('🌐 Testando Endpoints de IA em PRODUÇÃO\n');
console.log(`📍 URL Base: ${PRODUCTION_URL}\n`);

async function testEndpoint(name, path) {
  console.log(`\n🧪 Testando: ${name}`);
  console.log(`📍 ${PRODUCTION_URL}${path}`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${PRODUCTION_URL}${path}`);
    const elapsed = Date.now() - startTime;
    
    if (!response.ok) {
      console.error(`❌ FALHA: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`   Corpo: ${errorText.substring(0, 300)}...`);
      return false;
    }
    
    const data = await response.json();
    console.log(`✅ SUCESSO (${elapsed}ms)`);
    
    // Log resumido
    if (Array.isArray(data)) {
      console.log(`   📊 Retornou ${data.length} itens`);
      if (data.length > 0) {
        console.log(`   🔍 Primeiro item:`, JSON.stringify(data[0], null, 2).substring(0, 200) + '...');
      }
    } else if (data.title) {
      console.log(`   📄 Título: ${data.title}`);
      console.log(`   🕐 Gerado: ${data.generatedAt}`);
    } else {
      console.log(`   📦 Dados:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
    }
    
    return true;
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ ERRO (${elapsed}ms): ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 TESTANDO ENDPOINTS EM PRODUÇÃO (VERCEL)');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const results = {
    churn: await testEndpoint('Analytics Churn', '/api/analytics-churn'),
    upsell: await testEndpoint('Analytics Upsell', '/api/analytics-upsell'),
    report: await testEndpoint('Analytics Report', '/api/analytics-report?days=30'),
  };
  
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('📋 RESUMO DOS TESTES');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log(`${results.churn ? '✅' : '❌'} PASSOU      /api/analytics-churn`);
  console.log(`${results.upsell ? '✅' : '❌'} PASSOU      /api/analytics-upsell`);
  console.log(`${results.report ? '✅' : '❌'} PASSOU      /api/analytics-report`);
  console.log('');
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`🎯 Taxa de Sucesso: ${passedCount}/${totalCount} (${Math.round(passedCount/totalCount*100)}%)`);
  
  if (passedCount === totalCount) {
    console.log('\n🎉 PRODUÇÃO FUNCIONANDO! Agentes IA operacionais! 🤖');
    console.log('\n💡 Próximos passos:');
    console.log('   1. ✅ Endpoints HTTP validados');
    console.log('   2. Integrar frontend Analytics.tsx');
    console.log('   3. Configurar domínio customizado (opcional)');
    console.log('   4. Monitorar logs no Vercel Dashboard');
  } else {
    console.log('\n⚠️  Alguns endpoints falharam. Verifique:');
    console.log('   - Vercel Dashboard → Functions → Logs');
    console.log('   - Settings → Environment Variables');
    console.log('   - Redeploy se necessário');
  }
  
  console.log('═══════════════════════════════════════════════════════\n');
  
  process.exit(passedCount === totalCount ? 0 : 1);
}

runTests().catch(error => {
  console.error('\n💥 ERRO FATAL:', error);
  process.exit(1);
});
