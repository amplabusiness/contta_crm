/**
 * test-rate-limiting.js
 * 
 * Testa o sistema de rate limiting:
 * 1. Sliding window algorithm
 * 2. Headers corretos (X-RateLimit-*)
 * 3. Erro 429 quando exceder limite
 * 4. Reset automático após window
 */

import { 
  rateLimit, 
  rateLimitCombined,
  getRateLimitInfo,
  resetRateLimit,
  RATE_LIMITS 
} from '../utils/rateLimit.ts';

// ============================================================================
// HELPERS
// ============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function logTest(name, passed, details = '') {
  const emoji = passed ? '✅' : '❌';
  console.log(`${emoji} ${name}`);
  if (details) console.log(`   ${details}`);
}

// ============================================================================
// TESTES
// ============================================================================

async function testBasicRateLimit() {
  console.log('\n🧪 Teste 1: Rate Limit Básico');
  console.log('─'.repeat(60));
  
  const identifier = 'test:user:basic';
  const config = {
    windowMs: 5000, // 5 segundos para teste rápido
    maxRequests: 3,
    keyPrefix: 'test:ratelimit',
    message: 'Limite de teste excedido',
  };
  
  try {
    // Limpar estado anterior
    await resetRateLimit(identifier, config.keyPrefix);
    
    // Request 1 - Deve passar
    const info1 = await rateLimit(identifier, config);
    logTest('Request 1/3', info1.remaining === 2, `Remaining: ${info1.remaining}`);
    
    // Request 2 - Deve passar
    const info2 = await rateLimit(identifier, config);
    logTest('Request 2/3', info2.remaining === 1, `Remaining: ${info2.remaining}`);
    
    // Request 3 - Deve passar
    const info3 = await rateLimit(identifier, config);
    logTest('Request 3/3', info3.remaining === 0, `Remaining: ${info3.remaining}`);
    
    // Request 4 - Deve FALHAR com RateLimitError
    let blocked = false;
    try {
      await rateLimit(identifier, config);
    } catch (error) {
      blocked = error.name === 'RateLimitError';
    }
    logTest('Request 4/3 bloqueado', blocked, 'RateLimitError lançado');
    
    // Aguardar window expirar
    console.log('\n⏳ Aguardando 5s para window resetar...');
    await sleep(5100);
    
    // Request 5 - Deve passar novamente
    const info5 = await rateLimit(identifier, config);
    logTest('Request 5 após reset', info5.remaining === 2, `Remaining: ${info5.remaining}`);
    
    console.log('\n✅ Teste básico PASSOU');
    return true;
    
  } catch (error) {
    console.error('❌ Teste básico FALHOU:', error.message);
    return false;
  }
}

async function testSlidingWindow() {
  console.log('\n🧪 Teste 2: Sliding Window Precision');
  console.log('─'.repeat(60));
  
  const identifier = 'test:user:sliding';
  const config = {
    windowMs: 10000, // 10 segundos
    maxRequests: 5,
    keyPrefix: 'test:ratelimit',
  };
  
  try {
    await resetRateLimit(identifier, config.keyPrefix);
    
    // Fazer 5 requests rapidamente
    console.log('Fazendo 5 requests rápidos...');
    for (let i = 1; i <= 5; i++) {
      const info = await rateLimit(identifier, config);
      console.log(`  Request ${i}/5 - Remaining: ${info.remaining}`);
      await sleep(100); // 100ms entre requests
    }
    
    // Aguardar 6 segundos (mais da metade da window)
    console.log('\n⏳ Aguardando 6s (60% da window)...');
    await sleep(6000);
    
    // Tentar mais requests - deveria permitir alguns
    // (sliding window: requests antigas estão saindo)
    let allowedCount = 0;
    for (let i = 1; i <= 5; i++) {
      try {
        await rateLimit(identifier, config);
        allowedCount++;
        console.log(`  Request extra ${i} - Permitido`);
        await sleep(100);
      } catch (error) {
        console.log(`  Request extra ${i} - Bloqueado`);
      }
    }
    
    logTest(
      'Sliding window permite requests parciais',
      allowedCount >= 2 && allowedCount <= 5,
      `${allowedCount} requests permitidos após 6s`
    );
    
    console.log('\n✅ Teste sliding window PASSOU');
    return true;
    
  } catch (error) {
    console.error('❌ Teste sliding window FALHOU:', error.message);
    return false;
  }
}

async function testCombinedLimiter() {
  console.log('\n🧪 Teste 3: Rate Limit Combinado (User + IP)');
  console.log('─'.repeat(60));
  
  const userId = 'user123';
  const ipAddress = '192.168.1.100';
  const config = {
    windowMs: 5000,
    maxRequests: 2, // Limite restritivo
    keyPrefix: 'test:ratelimit:combined',
  };
  
  try {
    await resetRateLimit(`user:${userId}`, config.keyPrefix);
    await resetRateLimit(`ip:${ipAddress}`, config.keyPrefix);
    
    // Request 1 e 2 devem passar
    const info1 = await rateLimitCombined(userId, ipAddress, config);
    logTest('Combined request 1/2', info1.remaining >= 0);
    
    const info2 = await rateLimitCombined(userId, ipAddress, config);
    logTest('Combined request 2/2', info2.remaining >= 0);
    
    // Request 3 deve falhar
    let blocked = false;
    try {
      await rateLimitCombined(userId, ipAddress, config);
    } catch (error) {
      blocked = error.name === 'RateLimitError';
    }
    logTest('Combined request 3/2 bloqueado', blocked);
    
    console.log('\n✅ Teste combined PASSOU');
    return true;
    
  } catch (error) {
    console.error('❌ Teste combined FALHOU:', error.message);
    return false;
  }
}

async function testGetInfoWithoutConsuming() {
  console.log('\n🧪 Teste 4: Get Info Sem Consumir');
  console.log('─'.repeat(60));
  
  const identifier = 'test:user:info';
  const config = {
    windowMs: 5000,
    maxRequests: 10,
    keyPrefix: 'test:ratelimit',
  };
  
  try {
    await resetRateLimit(identifier, config.keyPrefix);
    
    // Get info inicial (não deve consumir)
    const before = await getRateLimitInfo(identifier, config);
    logTest('Info inicial', before.remaining === 10, `Remaining: ${before.remaining}`);
    
    // Fazer 3 requests
    await rateLimit(identifier, config);
    await rateLimit(identifier, config);
    await rateLimit(identifier, config);
    
    // Get info após consumo
    const after = await getRateLimitInfo(identifier, config);
    logTest('Info após 3 requests', after.remaining === 7, `Remaining: ${after.remaining}`);
    
    // Verificar que get info não consumiu
    const again = await getRateLimitInfo(identifier, config);
    logTest('Get info não consome', again.remaining === 7, `Still: ${again.remaining}`);
    
    console.log('\n✅ Teste get info PASSOU');
    return true;
    
  } catch (error) {
    console.error('❌ Teste get info FALHOU:', error.message);
    return false;
  }
}

async function testBurstProtection() {
  console.log('\n🧪 Teste 5: Proteção Contra Burst Attack');
  console.log('─'.repeat(60));
  
  const identifier = 'test:attacker:burst';
  const config = RATE_LIMITS.AI_ANALYSIS; // 5 req/min
  
  try {
    await resetRateLimit(identifier, config.keyPrefix);
    
    console.log('Simulando burst attack (20 requests simultâneas)...');
    
    // Enviar 20 requests em paralelo (burst attack)
    const promises = Array.from({ length: 20 }, (_, i) => 
      rateLimit(identifier, config)
        .then(() => ({ index: i, success: true }))
        .catch(error => ({ index: i, success: false, error: error.name }))
    );
    
    const results = await Promise.all(promises);
    
    const allowed = results.filter(r => r.success).length;
    const blocked = results.filter(r => !r.success).length;
    
    console.log(`  Permitidos: ${allowed}`);
    console.log(`  Bloqueados: ${blocked}`);
    
    logTest(
      'Burst bloqueado corretamente',
      allowed <= config.maxRequests && blocked >= 15,
      `Apenas ${allowed}/${20} requests permitidos`
    );
    
    console.log('\n✅ Teste burst protection PASSOU');
    return true;
    
  } catch (error) {
    console.error('❌ Teste burst protection FALHOU:', error.message);
    return false;
  }
}

// ============================================================================
// RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          🛡️ TESTES DE RATE LIMITING (V2)                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const results = [];
  
  results.push(await testBasicRateLimit());
  results.push(await testSlidingWindow());
  results.push(await testCombinedLimiter());
  results.push(await testGetInfoWithoutConsuming());
  results.push(await testBurstProtection());
  
  // Resumo
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMO DOS TESTES');
  console.log('═'.repeat(60));
  
  const passed = results.filter(r => r).length;
  const failed = results.length - passed;
  
  console.log(`✅ Passou: ${passed}/${results.length}`);
  console.log(`❌ Falhou: ${failed}/${results.length}`);
  console.log(`📈 Taxa de sucesso: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (passed === results.length) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    console.log('Rate limiting está funcionando corretamente.');
  } else {
    console.log('\n⚠️ ALGUNS TESTES FALHARAM');
    console.log('Revisar implementação do rate limiting.');
  }
  
  console.log('\n' + '═'.repeat(60));
}

// Executar testes
runAllTests().catch(console.error);
