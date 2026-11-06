export interface Quote {
  text: string
  by: string
}

/** Ladebildschirm-Zitate: gemeinfreie historische Zitate und augenzwinkernde Abwandlungen. */
export const QUOTES: Quote[] = [
  { text: 'Veni, vidi, vici.', by: 'Gaius Julius Caesar' },
  { text: 'Alea iacta est – der Würfel ist gefallen.', by: 'Gaius Julius Caesar' },
  { text: 'Panta rhei – alles fließt.', by: 'Heraklit, zugeschrieben' },
  { text: 'Die höchste Kunst des Krieges besteht darin, den Feind ohne Kampf zu unterwerfen.', by: 'Sunzi, Die Kunst des Krieges' },
  { text: 'Nicht weil es schwer ist, wagen wir es nicht, sondern weil wir es nicht wagen, ist es schwer.', by: 'Seneca' },
  { text: 'Es ist nicht wenig Zeit, die wir haben, sondern viel, die wir nicht nutzen.', by: 'Seneca' },
  { text: 'Der Krieg ist eine bloße Fortsetzung der Politik mit anderen Mitteln.', by: 'Carl von Clausewitz, Vom Kriege' },
  { text: 'Gebt mir einen festen Punkt, und ich hebe die Welt aus den Angeln.', by: 'Archimedes, zugeschrieben' },
  { text: 'Wissen ist Macht.', by: 'Francis Bacon, zugeschrieben' },
  { text: 'Ich weiß, dass ich nichts weiß.', by: 'Sokrates, nach Platon' },
  { text: 'Carpe diem.', by: 'Horaz' },
  { text: 'Si vis pacem, para bellum.', by: 'nach Vegetius' },
  { text: 'Eine Runde noch.', by: 'jeder von euch, um 3 Uhr nachts' },
  { text: 'Der beste Zeitpunkt für einen Civ-Abend war vor 20 Jahren. Der zweitbeste ist Freitag.', by: 'Sprichwort, frei abgewandelt' },
  { text: 'Ich kam, ich sah, ich trug mich im Kalender ein.', by: 'Caesar, sehr frei übersetzt' },
  { text: 'Alle Wege führen nach Rom. Alle Terminabsprachen führen zu „Vielleicht“.', by: 'Sprichwort, ergänzt' },
  { text: 'Rom wurde nicht an einem Tag erbaut. An einem Civ-Abend aber fast.', by: 'Sprichwort, ergänzt' },
  { text: 'Teile und herrsche. Aber trag dich vorher ein.', by: 'Lateinisches Sprichwort, ergänzt' },
  { text: 'Zeit ist Geld. Und Gold kauft Siedler.', by: 'Benjamin Franklin, sinngemäß weitergedacht' },
  { text: 'Die Geschichte schreiben die Sieger. Den Termin schreibt, wer zuerst im Kalender war.', by: 'Volksmund, angepasst' },
  { text: 'Wer „Vielleicht“ sagt, hat schon halb abgesagt.', by: 'Diplomatische Weisheit' },
  { text: 'Ein Barbar kommt selten allein.', by: 'Erfahrungswert' },
  { text: 'Ein leerer Kalender ist ein Krieg, der nie erklärt wurde.', by: 'Unbekannter Feldherr' },
  { text: 'Wer zu spät kommt, den bestraft die Geschichte. Wer gar nicht kommt, den bestrafen Barbaren.', by: 'Volksmund, erweitert' },

  // Völliger Quatsch: echte Personen, frei erfundene und absichtlich absurde Zitate
  { text: 'Scheiß mich an und piss mich sauber.', by: 'Angela Merkel' },
  { text: 'Hätte ich gewusst, dass es Bogenschützen gibt, hätte ich mehr Stühle gekauft.', by: 'Napoleon Bonaparte' },
  { text: 'Die Pyramiden waren eigentlich als Sitzsäcke geplant.', by: 'Kleopatra' },
  { text: 'Ich denke, also bin ich. Vielleicht. Ich trag mich mal mit „Vielleicht“ ein.', by: 'René Descartes' },
  { text: 'Gott würfelt nicht. Er spielt auf „Gottheit“ und verliert trotzdem gegen Barbaren.', by: 'Albert Einstein' },
  { text: 'Sein oder nicht sein – das ist ein Vielleicht.', by: 'William Shakespeare' },
  { text: 'Und sie ist doch eine Scheibe. Leberkäse.', by: 'Galileo Galilei' },
  { text: 'Man muss sich Sisyphos als glücklichen Menschen vorstellen, der seinen Siedler zum zwölften Mal umparkt.', by: 'Albert Camus' },
  { text: 'Gebt mir Kamele, und ich gebe euch Karamell.', by: 'Marco Polo' },
  { text: 'Der Mensch ist, was er isst. Ich bin demnach zu 80 Prozent Hirse.', by: 'Ludwig Feuerbach' },
  { text: 'Wasser ist nass. Aber nur von innen.', by: 'Thales von Milet' },
  { text: 'Ein kleiner Schritt für einen Menschen, aber ein riesiger für einen Krieger mit nur einer Bewegungseinheit.', by: 'Neil Armstrong' },
  { text: 'Mehr Licht! Und Pommes.', by: 'Johann Wolfgang von Goethe' },
  { text: 'Tschüssikowski.', by: 'Otto von Bismarck' },
  { text: 'Ich bin der Bratwurstkönig von Preußen und dulde keine Senfverweigerer.', by: 'Friedrich der Große' },
  { text: 'Keine Experimente. Außer mit Katapulten.', by: 'Konrad Adenauer' },
  { text: 'Ich habe die Elefanten nicht über die Alpen gebracht. Die Elefanten haben mich über die Alpen gebracht.', by: 'Hannibal' },
  { text: 'Das Rad ist überbewertet. Ich rolle lieber.', by: 'Aristoteles' },

  // Coole Zitate, vom User vorgegeben; Autoren frei erfunden (außer Bussacat)
  { text: 'Ich glaub mein Schwein pfeift Lapaloma.', by: 'Hannibal, beim ersten Blick auf die Alpen' },
  { text: 'Hömma, is das richtig geil?', by: 'Kaiser Wilhelm II., bei der Eröffnung der Zeche Zollverein' },
  { text: 'DAT IS HEIß DU AFFENJUNGE', by: 'Prometheus, beim Weiterreichen des Feuers' },
  { text: 'ICH GEB DEM DING GLEICH NE KOPFNUSS', by: 'Johannes Gutenberg, an der Druckerpresse' },
  { text: 'Lak, ich komm in dieses Café rein … das Café FULL … FULL', by: 'Ibn Battuta, Reisetagebuch, Band 3' },
  {
    text: 'Weh mi bad man friend dem from labbantil and all dem bad places yah, WEH DI MAN DEM, WEH CAN DEFEND DEMSELVES',
    by: 'Bussacat',
  },

  // Ausm Pott: Schalke, Zeche, Schacht und Steigerlied
  { text: 'Glück auf, Glück auf, der Siedler kommt!', by: 'Steigerlied, Civ-Fassung' },
  {
    text: 'Und er hat sein helles Licht bei der Nacht schon angezündet. Ich hab noch nich ma Bronzeverarbeitung.',
    by: 'Steigerlied, aus Sicht eines Steinzeit-Siedlers',
  },
  { text: 'Wat is dat denn fürn Weltwunder? Da passt ja nich ma ne Lore durch.', by: 'Cheops, bei der Abnahme der Pyramide' },
  { text: 'Gebt mir einen festen Steiger, und ich hol euch die ganze Kohle ausm Berg.', by: 'Archimedes, Zeche Zollverein, Schacht XII' },
  { text: 'Ers ma Schicht im Schacht. Dann Weltherrschaft.', by: 'Alexander der Große, nach der Frühschicht' },
  { text: 'Meister der Herzen is auch ne Siegbedingung.', by: 'Sunzi, Die Kunst des Abstiegskampfs' },
  { text: 'Taktik? Schalker Kreisel. Die Phalanx hat dat nur abgekupfert.', by: 'Philipp II. von Makedonien' },
  { text: 'Der Pott kocht. Der Vesuv übrigens auch.', by: 'Plinius der Ältere, kurz vor Pompeji' },
  { text: 'Mach ma die Kaue auf, ich komm direkt ausse Bronzezeit.', by: 'Ötzi, Schichtwechsel' },
  { text: 'Pommes Schranke und ne Runde noch.', by: 'Napoleon Bonaparte, anne Bude in Bottrop' },
  { text: 'Vonne Kohle im Keller zur Kohle aufm Konto – dat nennt man Wirtschaftssieg.', by: 'Adam Smith, Wanne-Eickel 1776' },
]
