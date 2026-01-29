// レベル1の問題（括弧なし）
const level1Problems = [
    { numbers: [6, 6, 6, 6], solution: '6 + 6 + 6 + 6' },
    { numbers: [1, 3, 4, 5], solution: '1 + 3 + 4 * 5' },
    { numbers: [1, 7, 8, 8], solution: '1 + 7 + 8 + 8' },
    { numbers: [2, 6, 8, 8], solution: '2 + 6 + 8 + 8' },
    { numbers: [3, 5, 8, 8], solution: '3 + 5 + 8 + 8' },
    { numbers: [4, 4, 8, 8], solution: '4 + 4 + 8 + 8' },
    { numbers: [5, 5, 7, 7], solution: '5 * 5 - 7 / 7' },
    { numbers: [2, 3, 3, 8], solution: '2 * 3 * 3 + 8' },
    { numbers: [1, 2, 5, 8], solution: '1 * 2 * 5 + 8' },
    { numbers: [2, 2, 5, 9], solution: '2 + 2 + 5 + 9' },
    { numbers: [1, 1, 6, 8], solution: '1 + 1 + 6 + 8' },
    { numbers: [3, 3, 6, 6], solution: '3 * 3 + 6 + 6' },
    { numbers: [2, 4, 4, 6], solution: '2 * 4 + 4 + 6' },
    { numbers: [1, 5, 6, 7], solution: '1 + 5 + 6 + 7' },
    { numbers: [2, 3, 7, 8], solution: '2 + 3 + 7 + 8' },
    { numbers: [1, 4, 6, 8], solution: '1 + 4 + 6 + 8' },
    { numbers: [3, 4, 4, 7], solution: '3 + 4 + 4 + 7' },
    { numbers: [2, 5, 5, 7], solution: '2 + 5 + 5 + 7' },
    { numbers: [1, 2, 8, 9], solution: '1 + 2 + 8 + 9' },
    { numbers: [4, 5, 6, 6], solution: '4 + 5 + 6 + 6' },
    { numbers: [3, 3, 3, 9], solution: '3 * 3 * 3 - 9' },
    { numbers: [2, 2, 2, 9], solution: '2 * 2 * 2 * 9' },
    { numbers: [1, 1, 4, 9], solution: '1 + 1 + 4 * 9' },
    { numbers: [2, 2, 3, 9], solution: '2 + 2 + 3 * 9' },
    { numbers: [1, 3, 5, 8], solution: '1 + 3 + 5 + 8' },
    { numbers: [2, 4, 5, 8], solution: '2 + 4 + 5 + 8' },
    { numbers: [3, 4, 5, 7], solution: '3 + 4 + 5 + 7' },
    { numbers: [1, 2, 4, 9], solution: '1 + 2 + 4 * 9' },
    { numbers: [2, 3, 4, 8], solution: '2 + 3 + 4 + 8' },
    { numbers: [1, 5, 5, 8], solution: '1 + 5 + 5 + 8' },
    { numbers: [3, 3, 4, 8], solution: '3 + 3 + 4 + 8' },
    { numbers: [2, 2, 6, 9], solution: '2 + 2 + 6 + 9' }
];

console.log('レベル1の問題を検証中...\n');
let errorCount = 0;
const errors = [];

level1Problems.forEach((problem, index) => {
    try {
        const result = eval(problem.solution);
        const nums = problem.numbers.join(', ');
        if (Math.abs(result - 24) < 0.0001) {
            console.log(`✓ 問題${index + 1}: [${nums}] = ${problem.solution} = ${result}`);
        } else {
            const msg = `✗ 問題${index + 1}: [${nums}] = ${problem.solution} = ${result} (24ではありません！)`;
            console.log(msg);
            errors.push(msg);
            errorCount++;
        }
    } catch (error) {
        const msg = `✗ 問題${index + 1}: [${problem.numbers.join(', ')}] = ${problem.solution} (エラー: ${error.message})`;
        console.log(msg);
        errors.push(msg);
        errorCount++;
    }
});

console.log(`\n合計: ${level1Problems.length}問中 ${errorCount}問が24になりません`);
if (errors.length > 0) {
    console.log('\n問題のある問題:');
    errors.forEach(err => console.log(err));
}
