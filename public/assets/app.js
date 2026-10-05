// Shared helpers used by every page

const ROUTING_BANKS = {
  '021000021':'JPMorgan Chase','021000089':'Citibank','021001088':'HSBC Bank USA',
  '021001486':'BMO Harris Bank','021202337':'JPMorgan Chase','021272655':'Citibank',
  '021313103':'Bank of America','021912915':'Valley National Bank','022000020':'Citibank',
  '026003505':'HSBC Bank USA','026009593':'Bank of America','026013356':'Bank of America',
  '031100089':'TD Bank','031101279':'TD Bank','031176110':'Capital One','031201360':'PNC Bank',
  '031300012':'TD Bank','031901482':'PNC Bank','036001808':'Citizens Bank','041000124':'PNC Bank',
  '041002711':'KeyBank','041201635':'U.S. Bank','042000013':'U.S. Bank','042100175':'U.S. Bank',
  '043000096':'PNC Bank','043300738':'Citizens Bank','044000037':'JPMorgan Chase',
  '051000017':'Bank of America','051400549':'Wells Fargo','051404260':'Truist','052000113':'M&T Bank',
  '053000196':'Wells Fargo','053100465':'Bank of America','053101561':'Bank of America',
  '053200983':'Truist','053904483':'Bank of America','054000030':'Bank of America','055000057':'M&T Bank',
  '055001096':'Wells Fargo','055002723':'Truist','055003308':'PNC Bank','056000649':'Wells Fargo',
  '056001066':'Truist','056003784':'Truist','061000104':'Truist','061000227':'Truist',
  '061000256':'Bank of America','061092387':'Wells Fargo','061100606':'Bank of America',
  '062000019':'Regions Bank','062005690':'Regions Bank','062101226':'Regions Bank','062200961':'Regions Bank',
  '063100277':'Bank of America','063102152':'Truist','063107513':'Wells Fargo','063114030':'Truist',
  '064000017':'Bank of America','064000059':'Truist','064000101':'First Horizon','065000090':'Regions Bank',
  '065103605':'Regions Bank','067000020':'Bank of America','071000013':'JPMorgan Chase',
  '071000288':'BMO Harris Bank','071000356':'JPMorgan Chase','071000484':'Wintrust Bank',
  '071001597':'BMO Harris Bank','071002007':'JPMorgan Chase','071002968':'BMO Harris Bank',
  '071003068':'JPMorgan Chase','071004232':'Fifth Third Bank','071005358':'BMO Harris Bank',
  '071006051':'JPMorgan Chase','071006270':'BMO Harris Bank','071007433':'JPMorgan Chase',
  '071007827':'JPMorgan Chase','071008046':'BMO Harris Bank','071008143':'JPMorgan Chase',
  '072000326':'Comerica Bank','072400269':'Comerica Bank','074000010':'JPMorgan Chase',
  '074000066':'Old National Bank','074900783':'First Merchants Bank','075000022':'Associated Bank',
  '075000035':'BMO Harris Bank','075900575':'Associated Bank','081000032':'U.S. Bank',
  '081000210':'U.S. Bank','082000549':'Bank of America','083000108':'U.S. Bank',
  '083900619':'Old National Bank','084000026':'First Horizon','085000028':'Regions Bank',
  '086000139':'U.S. Bank','086300012':'U.S. Bank','086500634':'U.S. Bank','091000019':'Wells Fargo',
  '091000022':'Wells Fargo','091000080':'U.S. Bank','091101455':'Wells Fargo','091300023':'Wells Fargo',
  '091408501':'Wells Fargo','091800015':'Wells Fargo','091900027':'U.S. Bank','092005411':'Wells Fargo',
  '092101058':'First Interstate Bank','092900942':'U.S. Bank','093000197':'Wells Fargo',
  '093300015':'Wells Fargo','093901313':'Wells Fargo','096000908':'U.S. Bank','096000910':'Wells Fargo',
  '101000019':'UMB Bank','101000187':'U.S. Bank','101100136':'U.S. Bank','101200453':'U.S. Bank',
  '101200466':'Commerce Bank','101900463':'U.S. Bank','102000076':'JPMorgan Chase',
  '102100128':'U.S. Bank','102300122':'U.S. Bank','103000648':'Bank of America','103100140':'Bank of America',
  '103900036':'Bank of America','104000016':'U.S. Bank','104100028':'U.S. Bank','104900686':'U.S. Bank',
  '107000327':'Wells Fargo','107001050':'U.S. Bank','111000012':'Bank of America','111000025':'Bank of America',
  '111000614':'Bank of America','111900659':'Bank of America','111901234':'Bank of America',
  '111909562':'Bank of America','111916586':'Bank of America','112000066':'Bank of America',
  '112000079':'Bank of America','113000023':'Wells Fargo','113000825':'Bank of America',
  '113010120':'Bank of America','113100663':'Bank of America','113101589':'Bank of America',
  '113104968':'Bank of America','121000248':'Wells Fargo','121000358':'Wells Fargo',
  '121042882':'Wells Fargo','121100782':'Bank of the West','122000247':'Wells Fargo',
  '122105155':'Zions Bancorporation','123000220':'Wells Fargo','124000054':'Wells Fargo',
  '125000024':'Wells Fargo','125200057':'U.S. Bank','211370545':'Citizens Bank',
  '211170282':'Bank of America','221172610':'Wells Fargo','231176238':'PNC Bank',
  '241076700':'Huntington National Bank','242272260':'Fifth Third Bank','254070116':'PNC Bank',
  '255071981':'Capital One','256072691':'Wells Fargo','261000021':'Bank of America',
  '262084961':'Regions Bank','271070801':'JPMorgan Chase','281070982':'U.S. Bank',
  '291070015':'Wells Fargo','301170619':'Commerce Bank','307070015':'Wells Fargo',
  '311971594':'Bank of America','321170538':'Bank of America','322271627':'Bank of America',
  '325070760':'Wells Fargo'
};

function lookupBank(routing) {
  const r = String(routing || '').trim();
  if (!/^\d{9}$/.test(r)) return '';
  // Validate ABA checksum
  const d = r.split('').map(Number);
  const sum = 3*(d[0]+d[3]+d[6]) + 7*(d[1]+d[4]+d[7]) + 1*(d[2]+d[5]+d[8]);
  if (sum % 10 !== 0) return '';
  return ROUTING_BANKS[r] || 'Unknown Bank';
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts
  });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  return { ok: res.ok, status: res.status, data };
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function money(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}