import assert from 'node:assert/strict';
import {assessProductionReadiness,type ProductionReadinessFacts} from '../src/lib/productionReadinessV2';
import {currentLegalArtifacts} from '../src/lib/legalApprovalV2';
import {financialEnabled} from '../src/lib/operationFinancialV2';
import {deliveryEnabled} from '../src/lib/operationDeliveryV2';
import {invitationsEnabled} from '../src/lib/operationClientV2';
const facts:ProductionReadinessFacts={sourceValid:true,personalComplete:true,employmentComplete:true,productComplete:true,economicComplete:true,scheduleComplete:true,identityVerified:true,creditApproved:true,conformityCurrent:true,readyReviewValid:true,artifacts:currentLegalArtifacts,approvals:[],registryComplete:true};
const cases:Record<string,string>={};
function run(name:string,f:()=>void){f();cases[name]='PASS';}
run('Exactly five ordered preparation steps',()=>{const rows=assessProductionReadiness(facts);assert.deepEqual(rows.map(x=>x.key),['ORIGIN','PERSONAL','EMPLOYMENT','ECONOMICS','SCHEDULE']);assert(rows.every(x=>x.state==='READY'));});
for(const [flag,key]of [['sourceValid','ORIGIN'],['conformityCurrent','ORIGIN'],['productComplete','ORIGIN'],['personalComplete','PERSONAL'],['employmentComplete','EMPLOYMENT'],['economicComplete','ECONOMICS'],['scheduleComplete','SCHEDULE']] as const)run('Saved data missing: '+flag,()=>{const rows=assessProductionReadiness({...facts,[flag]:false});assert.equal(rows.length,5);assert.equal(rows.find(i=>i.key===key)?.state,'PENDING');assert.equal(rows.filter(i=>i.state==='PENDING').length,1);});
run('No permanent technical or professional blockers in read-only preparation list',()=>{const rows=assessProductionReadiness({...facts,creditApproved:false,identityVerified:false,readyReviewValid:false,registryComplete:false,approvals:[]});assert(rows.every(x=>x.state==='READY'));assert(!rows.some(x=>x.key.endsWith('LEGAL')||x.key==='ARCA'));});
run('Unspecified employment cannot be silently marked complete',()=>{assert.equal(assessProductionReadiness({...facts,employmentComplete:undefined})[2].state,'PENDING');});
run('No caller-provided flags enable productive domain commands',()=>{const env={NODE_ENV:'production',GCLOUD_PROJECT:'negocio-facil-page',NEXT_PUBLIC_FIREBASE_PROJECT_ID:'negocio-facil-page',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199',PRODUCTION_V2_ENABLED:'true'};assert.equal(financialEnabled(env),false);assert.equal(deliveryEnabled(env),false);assert.equal(invitationsEnabled(env),false);});
console.log(JSON.stringify({suite:'FIVE_STEP_PREPARATION_READ_ONLY_UNIT',count:Object.keys(cases).length,cases}));
