const fs = require('fs');
const p = 'src/dashboard.tsx';
let s = fs.readFileSync(p, 'utf8');
const old = "      {showGreeting && userData.avatar_url && userData.avatar_index > 0 && (\n        <AvatarGreeting\n          avatarUrl={userData.avatar_url}\n          username={userData.username}\n          onDismiss={() => setShowGreeting(false)}\n        />\n      )}";
const neu = "      {showGreeting && userData.avatar_url && userData.avatar_index > 0 && (\n        <AvatarGreeting\n          avatarUrl={userData.avatar_url}\n          username={userData.username}\n          onDismiss={() => { try { sessionStorage.setItem('focusia_greeting_shown', '1'); } catch {} setShowGreeting(false); }}\n        />\n      )}";
if (s.indexOf(old) !== -1) {
  s = s.split(old).join(neu);
  fs.writeFileSync(p, s);
  console.log('ok');
} else {
  console.log('no');
}
