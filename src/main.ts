import { VectorEngine } from "./VectorSpace";

import data from "./data.json";

var fields: string[] = [];

const searchInput = document.querySelector<HTMLInputElement>("#search-input");
const searchIn = document.querySelector<HTMLSelectElement>("#search-in");

const searchOutputSync = document.querySelector<HTMLTextAreaElement>("#search-output-sync");
const searchTimingSync = document.querySelector<HTMLDivElement>("#search-timing-sync");

const searchOutputAsync = document.querySelector<HTMLTextAreaElement>("#search-output-async");
const searchTimingAsync = document.querySelector<HTMLDivElement>("#search-timing-async");

const searchEngine = new VectorEngine(data);
function searchSync() {
    searchOutputAsync!.value = "loading";
    const startTime = Date.now();
    const matches = searchEngine.searchSync(searchInput?.value || "", fields);
    searchTimingAsync!.innerText = `${Date.now() - startTime}ms`;
    searchOutputAsync!.value = matches
        .map((i) => {
            const obj = searchEngine.getInputSource()[i.index];
            let str = `${i.score}\n`;
            // @ts-ignore
            str += `Displayname:\t${obj?.displayname}\n`;
            // @ts-ignore
            str += `Username:\t${obj?.username}\n`;
            // @ts-ignore
            str += `Content:\n\n${obj?.content}\n`;
            // @ts-ignore
            str += `Medias:\n\n${obj?.medias.join("\n")}`;
            return str;
        })
        .join("\n\n" + "".padEnd(84, "=") + "\n\n");
}

function searchAsync() {
    searchOutputSync!.value = "loading";
    const startTime = Date.now();
    searchEngine.searchAsync(searchInput?.value || "", fields).then((matches) => {
        searchTimingSync!.innerText = `${Date.now() - startTime}ms`;
        searchOutputSync!.value = matches
            .map((i) => {
                const obj = searchEngine.getInputSource()[i.index];
                let str = `${i.score}\n`;
                // @ts-ignore
                str += `Displayname:\t${obj?.displayname}\n`;
                // @ts-ignore
                str += `Username:\t${obj?.username}\n`;
                // @ts-ignore
                str += `Content:\n\n${obj?.content}\n`;
                // @ts-ignore
                str += `Medias:\n\n${obj?.medias.join("\n")}`;
                return str;
            })
            .join("\n\n" + "".padEnd(84, "=") + "\n\n");
    });
}

for (const k of Object.keys(data[0])) {
    const opt = document.createElement("option");
    opt.value = k;
    opt.innerText = k;
    searchIn?.options.add(opt);
}

searchInput?.addEventListener("change", () => {
    searchAsync();
    searchSync();
});
searchInput?.addEventListener("input", () => {
    searchAsync();
    searchSync();
});
searchIn?.addEventListener("change", () => {
    // @ts-ignore
    fields = [];
    [...searchIn.querySelectorAll<HTMLOptionElement>("option")].forEach((el) => {
        if (el.selected) {
            fields.push(el.value);
        }
    });
    searchAsync();
    searchSync();
});
searchIn?.addEventListener("input", () => {
    // @ts-ignore
    fields = [];
    [...searchIn.querySelectorAll<HTMLOptionElement>("option")].forEach((el) => {
        if (el.selected) {
            fields.push(el.value);
        }
    });
    searchAsync();
    searchSync();
});
searchInput!.value = "";
searchAsync();
searchSync();
