"""Petit jeu : deviner un nombre entre 1 et 100."""

import random


def jouer(minimum=1, maximum=100):
    secret = random.randint(minimum, maximum)
    essais = 0
    print(f"J'ai choisi un nombre entre {minimum} et {maximum}. À toi de deviner !")

    while True:
        saisie = input("Ta proposition : ").strip()
        if not saisie.lstrip("-").isdigit():
            print("Merci d'entrer un nombre entier.")
            continue

        proposition = int(saisie)
        essais += 1

        if proposition < secret:
            print("C'est plus !")
        elif proposition > secret:
            print("C'est moins !")
        else:
            print(f"Bravo ! Tu as trouvé {secret} en {essais} essai(s).")
            return essais


def main():
    while True:
        jouer()
        if input("Rejouer ? (o/n) : ").strip().lower() != "o":
            print("À bientôt !")
            break


if __name__ == "__main__":
    main()
