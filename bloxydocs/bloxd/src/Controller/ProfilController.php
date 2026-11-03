<?php

namespace App\Controller;

use App\Entity\User;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class ProfilController extends AbstractController
{
    #[Route('/profil/{pseudo}', name: 'app_profil', methods: ['GET'])]
    public function show(#[MapEntity(mapping: ['pseudo' => 'pseudo'])] User $user): Response
    {
        $avis = $user->getAvis();
        $moyenne = null;
        if (!$avis->isEmpty()) {
            $total = 0;
            foreach ($avis as $a) {
                $total += $a->getNote();
            }
            $moyenne = round($total / $avis->count(), 1);
        }

        // genre le plus noté par ce joueur
        $parGenre = [];
        foreach ($avis as $a) {
            $nom = $a->getJeu()->getGenre()->getNom();
            $parGenre[$nom] = ($parGenre[$nom] ?? 0) + 1;
        }
        arsort($parGenre);

        return $this->render('profil/show.html.twig', [
            'profil' => $user,
            'moyenne' => $moyenne,
            'genrePrefere' => array_key_first($parGenre),
        ]);
    }
}
