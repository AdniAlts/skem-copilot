// Evaluasi akurasi dan token pada data/testset (memanggil gateway LLM). Logika di apps/api/src/eval.
import { main } from '../apps/api/src/eval/cli.js';

process.exitCode = await main(process.argv.slice(2));
