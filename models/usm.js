function setBpm(minScoreValue = 3, maxScoreValue = 5) {
    for (let i = 1; i <= 26; i++) {
        let radios = document.getElementsByName(`skor[${i}]`);

        if (radios.length > 0) {
            let randomValue = Math.floor(Math.random() * (maxScoreValue - minScoreValue + 1)) + minScoreValue;

    
            for (let radio of radios) {
                if (parseInt(radio.value) === randomValue) {
                    radio.checked = true;
                    break;
                }
            }
        }
    }
}

setBpm(3, 5);
