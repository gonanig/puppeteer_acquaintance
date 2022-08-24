import puppeteer from "puppeteer";
import readline from "readline";

import { bookGenres } from "./consts.js";

(async () => {
  /// select the genre in the node consolе
  const getBookGenre = () => {
    let rl = readline.createInterface(process.stdin, process.stdout);

    return new Promise((resolve, reject) => {
      bookGenres.forEach((genre, index) =>
        console.log(`[${index + 1}] ${genre.name}`)
      );
      rl.question("Enter the index of the selected book genre: ", (answer) => {
        console.log(`You choose index № ${answer}`);
        rl.close();

        if (isNaN(Number(answer))) {
          return reject(new Error("Value must be a number"));
        } else if (Number(answer) < 1 || Number(answer) > bookGenres.length) {
          return reject(new Error("This index is not among the proposed"));
        }
        return resolve(bookGenres[Number(answer) - 1].name);
      });
    }).catch((error) => {
      console.error(error.message);
      exit();
    });
  };

  let selectedGenre = await getBookGenre();

  // on the goodreads site by the specified genre select a book and copy his name

  const browser = await puppeteer.launch({ headless: false ,defaultViewport: null });
  const pageBestBooks = await browser.newPage();
  const url = "https://www.goodreads.com/choiceawards/best-books-2020";
  await pageBestBooks.goto(url);
  await pageBestBooks.type(".searchBox__input", selectedGenre);
  await pageBestBooks.click(".searchBox__icon--magnifyingGlass");
//   await pageBestBooks.waitForTimeout(1000);
  await pageBestBooks.waitForSelector(".bookTitle span");
  await pageBestBooks.waitForTimeout(1000);

  const booksOptions = await pageBestBooks.evaluate(() => {
    const books = document.querySelectorAll(".bookTitle span");
    const titles = [];
    for (let book of books) {
      titles.push(book);
    }
    return titles;
  });

  const bookTitles = [];
  for (let item of booksOptions) {
    const bookTitle = await pageBestBooks.evaluate(() => {
      const pickedItem = {};
      pickedItem.title = document.querySelector(".bookTitle span").innerText;
      return pickedItem;
    });
    bookTitles.push(bookTitle);
  }

  let oneRandomTitle =
    bookTitles[Math.floor(Math.random() * bookTitles.length)];

  let bookName = oneRandomTitle.title;

  await browser.close();

  /// in amazon we search for the selected book and add it to the cart

  const browser2 = await puppeteer.launch({ headless: false, defaultViewport: null });
  const pageAmazon = await browser2.newPage();
  const amazonUrl = "https://www.amazon.com/";
  await pageAmazon.goto(amazonUrl);
  await pageAmazon.type("#twotabsearchtextbox", bookName);
  await pageAmazon.click(".nav-search-submit input");

  await pageBestBooks.waitForTimeout(2000);
  await pageAmazon.waitForSelector(".s-result-item");

  const booksLinks = await pageAmazon.evaluate(() => {
    const elements = document.querySelectorAll(".s-result-item h2 a");
    const links = [];
    for (let element of elements) {
      links.push(element.href);
    }
    return links;
  });

  const bestResult = booksLinks[0];
  await pageAmazon.goto(bestResult);

  const btnNameOnPage = await pageAmazon.evaluate(() => {
    let elements = document.querySelector(
      "[id='accordion_row_header-COMPETITIVE_PRICE']"
    );
    let btnId = elements
      ? "#accordion_row_header-COMPETITIVE_PRICE"
      : "#one-click-button";

    return btnId;
  });

  await pageAmazon.click(btnNameOnPage);
  await pageAmazon.waitForTimeout(2000);
  await pageAmazon.click(".a-button-oneclick .a-button-inner .a-button-input");
})();
