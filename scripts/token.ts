import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, connectAuthEmulator } from 'firebase/auth';

const app = initializeApp({
  apiKey: 'fake-api-key',
  authDomain: 'demo-backend.firebaseapp.com',
  projectId: 'demo-backend',
});

const auth = getAuth(app);

connectAuthEmulator(auth, 'http://127.0.0.1:9099');

async function run() {
  const user = await signInWithEmailAndPassword(auth, 'nebotiffany@gmail.com', '123456');

  const token = await user.user.getIdToken();

  console.log('\n🔥 ID TOKEN:\n', token);
}

run();
