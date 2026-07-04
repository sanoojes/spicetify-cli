import { waitFor } from "./shared/async.js";

void (async function checkForUpdate() {
  if (!Spicetify.Config) {
    setTimeout(checkForUpdate, 300);
    return;
  }
  const { check_spicetify_update, version } = Spicetify.Config;
  // Skip checking if upgrade check is disabled, or version is Dev/version is not set
  if (!check_spicetify_update || !version || version === "Dev") return;
  // Fetch latest version from GitHub
  try {
    let changelog;
    const res = await fetch("https://api.github.com/repos/spicetify/cli/releases/latest");
    const { tag_name, html_url, body } = await res.json();
    const semver = tag_name.slice(1);
    const changelogRawDataOld = body.match(/## What's Changed([\s\S]*?)\r\n\r/)?.[1];
    if (changelogRawDataOld) {
      changelog = [...changelogRawDataOld.matchAll(/\r\n\*\s(.+?)\sin\shttps/g)]
        .map((match) => {
          const featureData = match[1].split("@");
          const feature = featureData[0];
          const committerID = featureData[1];
          return `<li>${feature}<a href="https://github.com/${committerID}">${committerID}</a></li>`;
        })
        .join("\n");
    } else {
      const sections = body.split("\n## ");
      const filteredSections = sections.filter((section) => !section.startsWith("Compatibility"));
      const filteredText = filteredSections.join("\n## ");
      changelog = [...filteredText.matchAll(/- (?:\*\*(.+?)\*\*:? )?(.+?) \(\[(.+?)\]\((.+?)\)\)/g)]
        .map((match) => {
          const feature = match[1];
          const description = match[2];
          const prNumber = match[3];
          const prLink = match[4];
          let text = "<li>";
          if (feature) text += `<strong>${feature}</strong>${!feature.endsWith(":") ? ": " : " "}`;
          text += `${description} (<a href="${prLink}">${prNumber}</a>)</li>`;
          return text;
        })
        .join("\n");
    }

    if (semver !== version) {
      const content = document.createElement("div");
      content.id = "spicetify-update";
      content.innerHTML = `
				<style>
					#spicetify-update a {
						text-decoration: underline;
					}
					#spicetify-update pre {
						cursor: pointer;
						font-size: 1rem;
						padding: 0.5rem;
						background-color: var(--spice-highlight-elevated);
						border-radius: 0.25rem;
					}
					#spicetify-update hr {
						border-color: var(--spice-subtext);
						margin-top: 1rem;
						margin-bottom: 1rem;
					}
					#spicetify-update ul,
					#spicetify-update ol {
						padding-left: 1.5rem;
					}
					#spicetify-update li {
						margin-top: 0.5rem;
						margin-bottom: 0.5rem;
						list-style-type: disc;
					}
					#spicetify-update ol > li {
						list-style-type: decimal;
					}
					.spicetify-update-space {
						margin-bottom: 25px;
					}
					.spicetify-update-little-space {
						margin-bottom: 8px;
					}
				</style>
				<p class="spicetify-update-space">Update Spicetify to receive new features and bug fixes.</p>
				<p> Current version: ${version} </p>
				<p> Latest version:
					<a href="${html_url}" target="_blank" rel="noopener noreferrer">
						${semver}
					</a>
				</p>
				<hr>
				<h3>What's Changed</h3>
				<details>
					<summary>
						See changelog
					</summary>
					<ul>
						${changelog}
					</ul>
				</details>
				<hr>
				<h3>Guide</h3>
				<p>Run these commands in the terminal:</p>
				<ol>
					<li>Update Spicetify CLI</li>
					<pre class="spicetify-update-little-space">spicetify update</pre>
					<p>Spicetify will automatically apply changes to Spotify after upgrading to the latest version.</p>
					<p>If you installed Spicetify via a package manager, update using said package manager.</p>
				</ol>
			`;

      void (async function attachUpdateTippy() {
        const Tippy = await waitFor(() => Spicetify.Tippy, 300);

        const tippy = Tippy(content.querySelectorAll("pre"), {
          content: "Click to copy",
          hideOnClick: false,
          ...Spicetify.TippyProps,
        });

        for (const instance of tippy) {
          instance.reference.addEventListener("click", () => {
            Spicetify.Platform.ClipboardAPI.copy(instance.reference.textContent);
            instance.setContent("Copied!");
            setTimeout(() => instance.setContent("Click to copy"), 1000);
          });
        }
      })();

      const updateModal = {
        title: "Update Spicetify",
        content,
        isLarge: true,
      };

      new Spicetify.Topbar.Button(
        "Update Spicetify",
        `<svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="22px" height="22px" viewBox="0 0 320.000000 400.000000"><g transform="translate(0.000000,400.000000) scale(0.100000,-0.100000)" fill="currentColor"><path d="M2213 3833 c3 -10 18 -52 34 -93 25 -67 28 -88 28 -200 0 -113 -3 -131 -27 -188 -87 -207 -222 -340 -613 -602 -206 -139 -308 -223 -442 -364 -117 -124 -133 -129 -146 -51 -28 173 -52 229 -130 307 -69 69 -133 101 -214 106 -80 5 -113 -3 -113 -28 0 -13 14 -25 43 -38 63 -28 113 -76 144 -140 25 -51 28 -68 28 -152 -1 -141 -27 -221 -193 -600 -133 -305 -164 -459 -138 -685 20 -168 46 -268 101 -382 127 -262 351 -451 642 -540 81 -24 102 -27 268 -27 159 -1 190 2 265 22 172 47 315 129 447 255 164 157 251 322 304 572 26 124 31 308 15 585 -7 130 -6 168 8 240 42 211 148 335 316 371 38 8 50 15 50 29 0 23 -27 30 -120 30 -101 0 -183 -22 -250 -68 -52 -36 -71 -58 -163 -203 -46 -73 -90 -96 -141 -75 -41 17 -51 43 -44 118 4 39 29 97 106 248 198 388 264 606 264 880 0 200 -37 347 -123 492 -53 91 -156 198 -188 198 -18 0 -22 -4 -18 -17z m-591 -2208 c277 -37 576 -148 608 -226 25 -59 -20 -129 -82 -129 -15 0 -61 16 -101 36 -133 67 -288 111 -480 135 -131 16 -447 7 -542 -16 -38 -10 -95 -19 -125 -22 -46 -4 -59 -1 -77 16 -41 38 -42 102 -4 140 33 33 270 78 441 84 109 4 249 -4 362 -18z m-40 -354 c142 -25 276 -68 397 -129 76 -38 97 -53 107 -79 23 -53 -8 -103 -63 -103 -19 0 -67 17 -111 39 -92 46 -203 84 -315 108 -128 28 -450 25 -573 -5 -68 -17 -97 -20 -117 -13 -47 18 -62 80 -29 120 55 69 457 104 704 62z m-48 -326 c183 -28 418 -126 432 -181 7 -29 -16 -69 -45 -77 -12 -3 -62 15 -123 43 -175 82 -240 95 -468 95 -149 0 -214 -4 -274 -18 -43 -9 -87 -17 -97 -17 -27 0 -59 35 -59 64 0 50 47 67 280 100 67 9 266 4 354 -9z"/></g></svg>`,
        () => Spicetify.PopupModal.display(updateModal),
      );
    }
  } catch (err) {
    console.error(err);
  }
})();
