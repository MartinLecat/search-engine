let tweets = [];
document.addEventListener("scroll", function () {
    [...document.querySelectorAll("article")].forEach((art) => {
        if (art.querySelector("time")) {
            if (tweets.filter((i) => i.link == art.querySelector("time").parentElement.href).length == 0) {
                let obj = {};
                obj["link"] = art.querySelector("time").parentElement.href;
                obj["displayname"] = art.querySelector("[data-testid='User-Name']").innerText.split("\n")[0];
                obj["username"] = art.querySelector("[data-testid='User-Name']").innerText.split("\n")[1];
                obj["content"] = art.querySelector("[data-testid='tweetText']")?.innerText;
                obj["medias"] = [...art.querySelectorAll("img:not([draggable='false'])")]?.map((img) => img.src);

                tweets.push(obj);
            }
        }
    });
});
