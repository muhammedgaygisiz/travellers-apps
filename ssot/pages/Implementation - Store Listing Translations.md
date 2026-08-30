# Implementation - Store Listing Translations

## Purpose

The ten locale translations of the store listing, derived from the English
source in [[Implementation - Store Listing Assets]].

They live here rather than only in the two consoles so that they are
reviewable in one diff, versioned with the product, and identical across Google
Play and the App Store. The consoles are where they are entered; this page is
what they are entered from.

Written 30 August 2026 for issue 1178.

## Why This Exists

The app ships eleven languages. Both store listings were English-only, which put
a fully localized product behind an English product page in ten of them. As
[[Implementation - Store Listing Assets]] puts it, a language is not finished
until both product pages carry it.

## Terminology Rules

This is the part to get right, and the part a translator working from the
English text alone would get wrong. The product nouns are **not** free to
translate, and the ones that are must match what the app already says.

| Term            | Rule                                                                          |
| --------------- | ----------------------------------------------------------------------------- |
| `BiteTribe`     | Never translated, never spaced. See [[Implementation - Store Listing Assets]] |
| `Bite`, `Bites` | Never translated. Turkish inflects it with an apostrophe: `Bite'ler`          |
| `BiteTrail`     | Never translated. Turkish: `BiteTrail'i`                                      |
| `Tribe`         | Never translated where it names the social graph                              |
| Bucket List     | **Translated**, and must match the app's own wording per locale               |
| Leaderboard     | **Translated**, and must match the app's own wording per locale               |

The two translated terms, taken from `apps/bite-tribe/src/assets/i18n/*.json`
rather than invented here:

| Locale | Bucket List          | Leaderboard     |
| ------ | -------------------- | --------------- |
| de     | Bucket-Liste         | Bestenliste     |
| tr     | yapılacaklar listesi | lider tablosu   |
| fr     | liste de souhaits    | classement      |
| es     | lista de deseos      | clasificación   |
| it     | lista dei desideri   | classifica      |
| pt     | lista                | classificação   |
| id     | daftar keinginan     | papan peringkat |
| th     | รายการความฝัน        | กระดานผู้นำ     |
| ar     | قائمة آمال           | لوحة المتصدرين  |
| am     | ዝርዝር                 | የመሪዎች ሰሌዳ       |

If the app's wording for either term changes, this page changes with it.
A listing that says one word and an app that says another is a defect the store
review will not catch.

## Fields Per Store

| Field             | Play | App Store | Limit | Note                           |
| ----------------- | ---- | --------- | ----- | ------------------------------ |
| App name          | yes  | yes       | 30    | `BiteTribe` in every locale    |
| Short description | yes  | -         | 80    | The slogan                     |
| Subtitle          | -    | yes       | 30    | The same slogan                |
| Full description  | yes  | yes       | 4000  | One body serves both           |
| Promotional text  | -    | yes       | 170   | Changeable without a build     |
| Keywords          | -    | yes       | 100   | Comma-separated, **no spaces** |

## The Slogan Is Rewritten, Not Translated

`Find it. Try it. Share it.` is three parallel beats in 26 characters. A literal
rendering loses the rhythm and usually breaks the 30-character subtitle cap, so
each locale gets its own three-beat line rather than a translation. Several use
bare infinitives or imperatives where English uses a verb plus a pronoun,
because that is what scans in that language.

## Keywords Are Not A Translation

The App Store keyword field is a search-term list, not prose. Translating
`foodie` literally spends budget on a word nobody types. Each set below is
composed from terms real users of that language would search, and the English
set is not a template for them.

**These are a first pass, not an optimised one.** Proper keyword selection needs
search-volume data this repository does not have. Revisit them once App Store
Connect reports impressions per term.

The app name and subtitle are already indexed by Apple and are deliberately not
repeated in the keyword field, in any locale.

## German (de)

Subtitle and short description:

```text
Finden. Probieren. Teilen.
```

Description:

```text
Jede Food-App sagt dir, wo du hingehen sollst. BiteTribe sagt dir, was du bestellen sollst.

Ein Bite ist ein echtes Gericht – fotografiert von der Person, die es gegessen hat, verortet an dem Ort, an dem sie es gegessen hat, mit dem bezahlten Preis und einer ehrlichen Meinung.

FINDE ETWAS, DAS SICH LOHNT
Entdecke Bites in deiner Nähe oder wechsle auf die Karte und sieh, was um die Ecke gut ist. Suche nach Gericht, Ort oder Tag. Jeder Bite hat ein Foto, einen Preis und eine echte Meinung – du entscheidest, bevor du dich hinsetzt.

TEILE, WAS DU GEGESSEN HAST
Fotografiere das Gericht, wähle den Ort, ergänze Preis und Bewertung. Deine Position und die lokale Währung werden für dich ausgefüllt. Ein Gericht pro Bite – genau das macht ihn für alle anderen nützlich.

FOLGE EINEM BITETRAIL
BiteTrails sind kuratierte kulinarische Touren. Speichere einen als Bucket-Liste und hake jeden Bite ab, sobald du ihn probiert hast. Gut für ein Wochenende in einer neuen Stadt – und genauso gut, um sich endlich durch das eigene Viertel zu essen.

BAU DIR DEINE TRIBE
Folge den Menschen, deren Geschmack du vertraust, und erfahre es, wenn sie etwas Neues posten. Antworte auf ihre Bewertungen, like, was dir gefällt, und sieh auf der Bestenliste, wie deine eigenen Beiträge zusammenkommen.

ÜBERALL GUT ESSEN
BiteTribe spricht elf Sprachen und rechnet in lokalen Währungen – ein Bite, den du in Zürich speicherst, ergibt auch in Bangkok noch Sinn.

Finden. Probieren. Teilen.
```

Promotional text:

```text
Jeder Pin auf der Karte ist ein echtes Gericht, fotografiert von der Person, die es gegessen hat, mit dem bezahlten Preis und einer ehrlichen Meinung.
```

Keywords:

```text
essen,gericht,restaurant,foodie,lokal,speisekarte,bewertung,entdecken,küche,reisen,mahlzeit,tipps
```

## Turkish (tr)

Subtitle and short description:

```text
Bul. Dene. Paylaş.
```

Description:

```text
Her yemek uygulaması sana nereye gideceğini söyler. BiteTribe ne sipariş edeceğini söyler.

Bir Bite, gerçek bir yemektir – onu yiyen kişi tarafından fotoğraflanmış, yendiği yere iğnelenmiş, ödenen fiyatı ve dürüst yorumuyla birlikte.

YEMEYE DEĞER BİR ŞEY BUL
Yakınındaki Bite'lere göz at ya da haritaya geçip köşe başında ne güzel olduğunu gör. Yemeğe, mekâna veya etikete göre ara. Her Bite'ta bir fotoğraf, bir fiyat ve gerçek bir yorum var; masaya oturmadan karar ver.

NE YEDİĞİNİ PAYLAŞ
Yemeği fotoğrafla, mekânı etiketle, fiyatı ve puanını ekle. Konumun ve yerel para birimin senin için doldurulur. Her Bite'ta tek bir yemek – onu herkes için faydalı kılan da bu.

BİR BITETRAIL'İ TAKİP ET
BiteTrail'ler özenle hazırlanmış lezzet rotalarıdır. Birini yapılacaklar listene kaydet ve denedikçe her Bite'ı kaydırarak işaretle. Yeni bir şehirde hafta sonu için de, kendi mahalleni sonunda baştan sona yemek için de birebir.

KENDİ TRIBE'INI KUR
Damak tadına güvendiğin insanları takip et, yeni bir şey paylaştıklarında haberin olsun. Yorumlarına cevap ver, sevdiklerini beğen ve kendi katkılarının lider tablosunda birikişini izle.

HER YERDE İYİ YE
BiteTribe on bir dil konuşur ve yerel para birimleriyle çalışır; Zürih'te kaydettiğin bir Bite, Bangkok'ta okuduğunda da anlamlıdır.

Bul. Dene. Paylaş.
```

Promotional text:

```text
Haritadaki her iğne gerçek bir yemek; onu yiyen kişi tarafından fotoğraflandı, ödenen fiyatı ve dürüst yorumuyla birlikte.
```

Keywords:

```text
yemek,restoran,lezzet,menü,yakınımda,yerel,inceleme,keşfet,mutfak,seyahat,öğün,tavsiye
```

## French (fr)

Subtitle and short description:

```text
Trouvez. Goûtez. Partagez.
```

Description:

```text
Toutes les applis food vous disent où aller. BiteTribe vous dit quoi commander.

Un Bite, c'est un vrai plat – photographié par la personne qui l'a mangé, épinglé à l'endroit où elle l'a mangé, avec le prix payé et son avis sincère.

TROUVEZ QUELQUE CHOSE QUI EN VAUT LA PEINE
Parcourez les Bites près de vous, ou passez à la carte pour voir ce qui est bon au coin de la rue. Cherchez par plat, par lieu ou par tag. Chaque Bite porte une photo, un prix et un vrai avis : vous décidez avant de vous asseoir.

PARTAGEZ CE QUE VOUS AVEZ MANGÉ
Photographiez le plat, identifiez le lieu, ajoutez le prix et votre note. Votre position et la devise locale sont remplies pour vous. Un plat par Bite – c'est ce qui le rend utile à tous les autres.

SUIVEZ UN BITETRAIL
Les BiteTrails sont des parcours gourmands composés à la main. Enregistrez-en un comme liste de souhaits et cochez chaque Bite à mesure que vous le goûtez. Parfait pour un week-end dans une nouvelle ville, tout autant que pour enfin explorer votre propre quartier.

CONSTRUISEZ VOTRE TRIBE
Suivez les personnes dont vous aimez le goût et soyez prévenu quand elles publient. Répondez à leurs avis, aimez ce qui vous plaît, et regardez vos propres contributions grimper au classement.

BIEN MANGER PARTOUT
BiteTribe parle onze langues et gère les devises locales : un Bite enregistré à Zurich a toujours du sens quand vous le relisez à Bangkok.

Trouvez. Goûtez. Partagez.
```

Promotional text:

```text
Chaque épingle sur la carte est un vrai plat, photographié par la personne qui l'a mangé, avec le prix payé et son avis sincère.
```

Keywords:

```text
cuisine,plat,manger,restaurant,menu,proximité,local,avis,découvrir,voyage,repas,gastronomie
```

## Spanish (es)

Subtitle and short description:

```text
Encuentra. Prueba. Comparte.
```

Description:

```text
Todas las apps de comida te dicen adónde ir. BiteTribe te dice qué pedir.

Un Bite es un plato real: fotografiado por quien se lo comió, ubicado en el sitio donde se lo comió, con el precio que pagó y lo que opinó de verdad.

ENCUENTRA ALGO QUE MEREZCA LA PENA
Explora los Bites cerca de ti o pasa al mapa para ver qué hay bueno a la vuelta de la esquina. Busca por plato, por sitio o por etiqueta. Cada Bite lleva una foto, un precio y una opinión real, para que decidas antes de sentarte.

COMPARTE LO QUE COMISTE
Fotografía el plato, etiqueta el sitio, añade el precio y tu valoración. Tu posición y la moneda local se rellenan solas. Un plato por Bite: eso es lo que lo hace útil para los demás.

SIGUE UN BITETRAIL
Los BiteTrails son rutas gastronómicas seleccionadas a mano. Guarda una como lista de deseos y ve marcando cada Bite según lo pruebas. Ideal para un fin de semana en una ciudad nueva, y también para comerte por fin tu propio barrio.

CONSTRUYE TU TRIBE
Sigue a las personas de cuyo gusto te fías y entérate cuando publiquen algo nuevo. Responde a sus reseñas, dale me gusta a lo que te encanta y mira cómo suman tus propias aportaciones en la clasificación.

COME BIEN EN CUALQUIER PARTE
BiteTribe habla once idiomas y maneja monedas locales, así que un Bite que guardas en Zúrich sigue teniendo sentido cuando lo lees en Bangkok.

Encuentra. Prueba. Comparte.
```

Promotional text:

```text
Cada chincheta del mapa es un plato real, fotografiado por quien se lo comió, con el precio que pagó y lo que opinó de verdad.
```

Keywords:

```text
comida,plato,comer,restaurante,menú,cerca,local,reseña,descubrir,viaje,gastronomía,cocina
```

## Italian (it)

Subtitle and short description:

```text
Trova. Prova. Condividi.
```

Description:

```text
Ogni app di cibo ti dice dove andare. BiteTribe ti dice cosa ordinare.

Un Bite è un piatto vero: fotografato da chi l'ha mangiato, fissato al posto in cui l'ha mangiato, con il prezzo pagato e quello che ne ha pensato davvero.

TROVA QUALCOSA CHE VALGA LA PENA
Sfoglia i Bite vicino a te, o passa alla mappa per vedere cosa c'è di buono dietro l'angolo. Cerca per piatto, locale o tag. Ogni Bite porta una foto, un prezzo e un'opinione vera, così decidi prima di sederti.

CONDIVIDI QUELLO CHE HAI MANGIATO
Fotografa il piatto, tagga il locale, aggiungi il prezzo e il tuo voto. La tua posizione e la valuta locale vengono compilate per te. Un piatto per Bite: è questo che lo rende utile a tutti gli altri.

SEGUI UN BITETRAIL
I BiteTrail sono percorsi gastronomici curati a mano. Salvane uno come lista dei desideri e spunta ogni Bite man mano che lo provi. Perfetto per un weekend in una città nuova, e altrettanto per mangiarti finalmente il tuo quartiere.

COSTRUISCI LA TUA TRIBE
Segui le persone di cui ti fidi per gusto e scopri quando pubblicano qualcosa di nuovo. Rispondi alle loro recensioni, metti mi piace a ciò che ami e guarda i tuoi contributi salire in classifica.

MANGIA BENE OVUNQUE
BiteTribe parla undici lingue e gestisce le valute locali: un Bite salvato a Zurigo ha ancora senso quando lo leggi a Bangkok.

Trova. Prova. Condividi.
```

Promotional text:

```text
Ogni segnaposto sulla mappa è un piatto vero, fotografato da chi l'ha mangiato, con il prezzo pagato e quello che ne ha pensato davvero.
```

Keywords:

```text
cibo,piatto,mangiare,ristorante,menu,vicino,locale,recensione,scoprire,viaggio,cucina,pasto
```

## Portuguese (pt)

Brazilian Portuguese, following the longer prose already in `pt.json`.

Subtitle and short description:

```text
Encontre. Prove. Compartilhe.
```

Description:

```text
Todo app de comida diz aonde ir. O BiteTribe diz o que pedir.

Um Bite é um prato de verdade: fotografado por quem comeu, fixado no lugar onde comeu, com o preço pago e o que a pessoa realmente achou.

ENCONTRE ALGO QUE VALHA A PENA
Veja os Bites perto de você ou mude para o mapa e descubra o que é bom ali na esquina. Busque por prato, lugar ou tag. Cada Bite traz uma foto, um preço e uma opinião real, para você decidir antes de sentar.

COMPARTILHE O QUE VOCÊ COMEU
Fotografe o prato, marque o lugar, adicione o preço e sua nota. Sua posição e a moeda local são preenchidas para você. Um prato por Bite: é isso que o torna útil para todo mundo.

SIGA UM BITETRAIL
BiteTrails são roteiros gastronômicos escolhidos a dedo. Salve um como lista e vá riscando cada Bite conforme experimenta. Ótimo para um fim de semana em uma cidade nova e igualmente bom para finalmente comer o seu próprio bairro.

MONTE A SUA TRIBE
Siga as pessoas em cujo paladar você confia e saiba quando elas publicarem algo novo. Responda às avaliações, curta o que você ama e veja suas contribuições subirem na classificação.

COMA BEM EM QUALQUER LUGAR
O BiteTribe fala onze idiomas e lida com moedas locais, então um Bite salvo em Zurique continua fazendo sentido quando você o lê em Bangkok.

Encontre. Prove. Compartilhe.
```

Promotional text:

```text
Cada marcador no mapa é um prato de verdade, fotografado por quem comeu, com o preço pago e o que a pessoa realmente achou.
```

Keywords:

```text
comida,prato,comer,restaurante,cardápio,perto,local,avaliação,descobrir,viagem,culinária,refeição
```

## Indonesian (id)

Subtitle and short description:

```text
Temukan. Cicipi. Bagikan.
```

Description:

```text
Semua aplikasi makanan memberi tahu ke mana harus pergi. BiteTribe memberi tahu apa yang harus dipesan.

Bite adalah satu hidangan nyata – difoto oleh orang yang memakannya, ditandai di tempat ia memakannya, lengkap dengan harga yang dibayar dan pendapat jujurnya.

TEMUKAN SESUATU YANG LAYAK DIMAKAN
Jelajahi Bites di dekatmu, atau beralih ke peta untuk melihat apa yang enak di sekitar. Cari berdasarkan hidangan, tempat, atau tag. Setiap Bite punya foto, harga, dan pendapat nyata, jadi kamu bisa memutuskan sebelum duduk.

BAGIKAN APA YANG KAMU MAKAN
Foto hidangannya, tandai tempatnya, tambahkan harga dan penilaianmu. Posisi dan mata uang lokalmu diisi otomatis. Satu hidangan per Bite – itulah yang membuatnya berguna untuk semua orang.

IKUTI SEBUAH BITETRAIL
BiteTrails adalah perjalanan kuliner pilihan. Simpan satu sebagai daftar keinginan dan centang setiap Bite begitu kamu mencobanya. Cocok untuk akhir pekan di kota baru, dan sama cocoknya untuk akhirnya menjelajahi lingkunganmu sendiri.

BANGUN TRIBE-MU
Ikuti orang-orang yang seleranya kamu percaya dan dapat kabar saat mereka memposting sesuatu yang baru. Balas ulasan mereka, sukai yang kamu suka, dan lihat kontribusimu sendiri bertambah di papan peringkat.

MAKAN ENAK DI MANA SAJA
BiteTribe berbicara sebelas bahasa dan menangani mata uang lokal, jadi Bite yang kamu simpan di Zurich tetap masuk akal saat kamu membacanya di Bangkok.

Temukan. Cicipi. Bagikan.
```

Promotional text:

```text
Setiap pin di peta adalah hidangan nyata, difoto oleh orang yang memakannya, lengkap dengan harga yang dibayar dan pendapat jujurnya.
```

Keywords:

```text
makanan,hidangan,makan,restoran,menu,terdekat,lokal,ulasan,jelajahi,kuliner,wisata,rekomendasi
```

## Thai (th)

Subtitle and short description:

```text
ค้นหา ลอง แบ่งปัน
```

Description:

```text
แอปอาหารทุกตัวบอกคุณว่าควรไปที่ไหน BiteTribe บอกคุณว่าควรสั่งอะไร

Bite คืออาหารจานจริงหนึ่งจาน ถ่ายโดยคนที่กินมันจริง ปักหมุดไว้ที่ร้านที่เขากิน พร้อมราคาที่จ่ายและความเห็นตรงไปตรงมา

ค้นหาสิ่งที่คุ้มค่าแก่การกิน
เลื่อนดู Bites ใกล้ตัวคุณ หรือสลับไปที่แผนที่เพื่อดูว่ามีอะไรอร่อยอยู่แถวนี้ ค้นหาด้วยชื่ออาหาร ร้าน หรือแท็ก ทุก Bite มีรูป ราคา และความเห็นจริง คุณจึงตัดสินใจได้ก่อนนั่งลง

แบ่งปันสิ่งที่คุณกิน
ถ่ายรูปอาหาร แท็กร้าน ใส่ราคาและคะแนนของคุณ ตำแหน่งและสกุลเงินท้องถิ่นถูกกรอกให้อัตโนมัติ หนึ่งจานต่อหนึ่ง Bite นั่นคือสิ่งที่ทำให้มันมีประโยชน์กับคนอื่น

ตาม BITETRAIL
BiteTrails คือเส้นทางกินที่คัดสรรมาแล้ว บันทึกไว้เป็นรายการความฝันแล้วปัดทำเครื่องหมายแต่ละ Bite เมื่อคุณได้ลอง เหมาะกับสุดสัปดาห์ในเมืองใหม่ และเหมาะพอกันกับการกินให้ทั่วย่านของคุณเองเสียที

สร้าง Tribe ของคุณ
ติดตามคนที่คุณเชื่อรสนิยม และรู้ทันทีเมื่อเขาโพสต์อะไรใหม่ ตอบรีวิวของพวกเขา กดถูกใจสิ่งที่คุณชอบ และดูผลงานของคุณเองไต่ขึ้นบนกระดานผู้นำ

กินดีได้ทุกที่
BiteTribe พูดได้สิบเอ็ดภาษาและรองรับสกุลเงินท้องถิ่น Bite ที่คุณบันทึกในซูริกจึงยังเข้าใจได้เมื่อคุณอ่านมันในกรุงเทพฯ

ค้นหา ลอง แบ่งปัน
```

Promotional text:

```text
ทุกหมุดบนแผนที่คืออาหารจานจริง ถ่ายโดยคนที่กินมัน พร้อมราคาที่จ่ายและความเห็นตรงไปตรงมา
```

Keywords:

```text
อาหาร,ร้านอาหาร,กิน,เมนู,ใกล้ฉัน,รีวิว,ค้นหา,ท้องถิ่น,ท่องเที่ยว,ของอร่อย
```

## Arabic (ar)

Right-to-left. The Latin product nouns stay Latin and are read left-to-right
inside the Arabic run, which is normal and needs no markup in either console.

Subtitle and short description:

```text
اكتشف. جرّب. شارك.
```

Description:

```text
كل تطبيقات الطعام تخبرك إلى أين تذهب. BiteTribe يخبرك بما تطلب.

الـ Bite طبق حقيقي واحد – صوّره الشخص الذي أكله، ومثبّت على المكان الذي أكله فيه، مع السعر الذي دفعه ورأيه الصريح.

اعثر على ما يستحق الأكل
تصفّح الـ Bites القريبة منك، أو انتقل إلى الخريطة لترى ما هو لذيذ عند الناصية. ابحث بالطبق أو المكان أو الوسم. كل Bite يحمل صورة وسعرًا ورأيًا حقيقيًا، لتقرر قبل أن تجلس.

شارك ما أكلته
صوّر الطبق، وحدّد المكان، وأضف السعر وتقييمك. يُملأ موقعك والعملة المحلية تلقائيًا. طبق واحد لكل Bite – وهذا ما يجعله مفيدًا للجميع.

اتبع BITETRAIL
الـ BiteTrails رحلات طعام منسّقة بعناية. احفظ واحدة كقائمة آمال وأشّر على كل Bite بمجرد أن تجربه. مثالية لعطلة نهاية أسبوع في مدينة جديدة، ومناسبة تمامًا لتأكل أخيرًا حيّك أنت.

ابنِ الـ Tribe الخاصة بك
تابع من تثق بذوقهم واعرف حين ينشرون شيئًا جديدًا. ردّ على مراجعاتهم، وأعجب بما تحب، وشاهد مساهماتك تتراكم على لوحة المتصدرين.

كُل جيدًا في أي مكان
يتحدث BiteTribe إحدى عشرة لغة ويتعامل مع العملات المحلية، فالـ Bite الذي تحفظه في زيورخ يظل مفهومًا حين تقرأه في بانكوك.

اكتشف. جرّب. شارك.
```

Promotional text:

```text
كل دبوس على الخريطة هو طبق حقيقي، صوّره الشخص الذي أكله، مع السعر الذي دفعه ورأيه الصريح.
```

Keywords:

```text
طعام,طبق,أكل,مطعم,قائمة,قريب,محلي,مراجعة,اكتشاف,سفر,وجبة,مأكولات
```

## Amharic (am)

Subtitle and short description:

```text
ያግኙት። ይቅመሱት። ያጋሩት።
```

Description:

```text
ሁሉም የምግብ መተግበሪያዎች የት እንደሚሄዱ ይነግሩዎታል። BiteTribe ምን እንደሚያዝዙ ይነግርዎታል።

Bite አንድ እውነተኛ ምግብ ነው – በበላው ሰው የተነሳ፣ በበላበት ቦታ ላይ የተሰካ፣ ከከፈለው ዋጋ እና ከቅን አስተያየቱ ጋር።

ለመብላት የሚያስቆጭ ነገር ያግኙ
በአቅራቢያዎ ያሉ Bites ን ይመልከቱ፣ ወይም ወደ ካርታው ተሸጋግረው በአካባቢው ምን ጥሩ እንዳለ ይዩ። በምግብ፣ በቦታ ወይም በመለያ ይፈልጉ። እያንዳንዱ Bite ፎቶ፣ ዋጋ እና እውነተኛ አስተያየት ይዟል፤ ስለዚህ ከመቀመጥዎ በፊት ይወስናሉ።

የበሉትን ያጋሩ
ምግቡን ያንሱ፣ ቦታውን ይለዩ፣ ዋጋውንና ደረጃዎን ያክሉ። ቦታዎ እና የአካባቢው ገንዘብ በራስ-ሰር ይሞላሉ። በአንድ Bite አንድ ምግብ – ለሌሎች ሁሉ ጠቃሚ የሚያደርገው ይህ ነው።

BITETRAIL ን ይከተሉ
BiteTrails በጥንቃቄ የተመረጡ የምግብ ጉዞዎች ናቸው። አንዱን እንደ ዝርዝር ያስቀምጡ እና እያንዳንዱን Bite ሲቀምሱ ምልክት ያድርጉ። በአዲስ ከተማ ለሳምንት መጨረሻ ጥሩ ነው፤ የራስዎን ሰፈር በመጨረሻ ለመብላትም እንዲሁ።

የራስዎን Tribe ይገንቡ
ጣዕማቸውን የሚያምኑባቸውን ሰዎች ይከተሉ እና አዲስ ነገር ሲለጥፉ ይወቁ። አስተያየታቸውን ይመልሱ፣ የሚወዱትን ይውደዱ፣ እና የራስዎ አስተዋጽኦ በመሪዎች ሰሌዳ ላይ ሲጨምር ይመልከቱ።

የትም ቦታ በደንብ ይብሉ
BiteTribe አስራ አንድ ቋንቋዎችን ይናገራል እና የአካባቢ ገንዘቦችን ይይዛል፤ ስለዚህ በዙሪክ ያስቀመጡት Bite በባንኮክ ሲያነቡት አሁንም ትርጉም ይሰጣል።

ያግኙት። ይቅመሱት። ያጋሩት።
```

Promotional text:

```text
በካርታው ላይ ያለ እያንዳንዱ ምልክት እውነተኛ ምግብ ነው፤ በበላው ሰው የተነሳ፣ ከከፈለው ዋጋ እና ከቅን አስተያየቱ ጋር።
```

Keywords:

```text
ምግብ,መብላት,ሜኑ,ጣዕም,አካባቢያዊ,ግምገማ,ማግኘት,ጉዞ,ምግቦች,ካፌ
```

## Where They Were Entered

Both stores on 30 August 2026.

### Google Play - ten locales, submitted

All ten went in as `pt-BR`, `es-ES`, `de-DE`, `it-IT`, `tr-TR`, `fr-FR`, `th`,
`id`, `am`, `ar`, and were **submitted for review** the same day.

Three things worth knowing before repeating this:

- **Play validates every locale at once.** A save is refused with "Some
  languages have errors" until all ten are complete, so it is one save at the
  end rather than one per language.
- **The variant lists are traps.** Searching `French` puts **French (Canada)**
  first and French (France) second; a blind click on the first result gives
  `fr-CA` European French. Spanish and Portuguese have no generic entry at all,
  so `es-ES` and `pt-BR` were chosen deliberately - see the note below.
- Play's short description cap is 80, so the 30-character subtitle fits both
  stores unchanged.

### App Store - nine locales, saved but not submitted

**Amharic is not offered by the App Store.** Apple's localization list has no
`am`, so Amharic speakers get the English product page no matter what. The app
speaks eleven languages, Play carries ten, Apple can carry nine. This is a
platform limit, not an omission to fix.

Apple also splits the fields across two pages, which is easy to half-finish:

| Field                                                | Page            |
| ---------------------------------------------------- | --------------- |
| Name, Subtitle                                       | App Information |
| Promotional Text, Description, Keywords, Support URL | version page    |

Two conveniences: a new localization is **pre-filled with the English text**, so
an unfinished one looks plausible rather than empty, and **screenshots are
inherited from the primary language**, so no per-locale captures are needed.

The nine are saved. They reach review with the version itself through **Add for
Review**, not through a separate submission the way Play works.

### The es and pt variants

Play and the App Store both refuse a generic Spanish or Portuguese. The app
ships plain `es` and `pt`, so a regional choice had to be invented for the
listings: **es-ES** and **pt-BR**, matching how the copy is written - the
Portuguese follows `pt.json`, which is Brazilian.

The cost is that Play may show English rather than falling back across regions,
so a user in Mexico or Portugal could see the English page. Adding `es-419` and
`pt-PT` with the same text would close that, at the price of Brazilian wording
sitting in a Portugal listing. Revisit once the soft launch shows where users
actually come from.

## Verify With A Checksum, Not A Length

Two of the ten reached the Play console corrupted, and **both passed a
length check**, because every wrong character was still one codepoint:

- Turkish `birikisini` for `birikişini`, then `birikışini` on the first
  correction attempt - a dotless `ı` for a dotted `i`.
- Amharic had five substitutions, including `ቀኛንቆችን` for `ቋንቋዎችን`, which is not
  a word.

Both came from hand-writing `\u` escapes. The fix is to generate the escapes
mechanically from this page and then verify the field by reading it back and
comparing **length plus the sum of codepoints** against the source. Every field
in both stores was checked that way, and all 27 Apple fields and 30 Play fields
match this page exactly.

This is the reason to draft into the SSOT before touching a console. Without a
committed source there is nothing to check against, and Amharic would have
shipped as gibberish to the audience least able to report it.

## Review Status

Not one of these has been read by a native speaker other than the author.

Machine-quality translation is good enough to ship a listing and not good enough
to be confident in, and the risk is not evenly spread: German, French, Spanish,
Italian and Portuguese are close enough to the English that an error would be
obvious, while **Thai, Arabic and Amharic** would carry an awkward or wrong
phrasing silently. Have those three read before they become the public face of
the product.

## Related Pages

- [[Implementation - Store Listing Assets]]
- [[Implementation - Localization]]
- [[Implementation - Store Release Steps]]
