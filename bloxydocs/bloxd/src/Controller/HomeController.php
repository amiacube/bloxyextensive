<?php

namespace App\Controller;

use App\Repository\AvisRepository;
use App\Repository\JeuRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class HomeController extends AbstractController
{
    #[Route('/', name: 'app_home')]
    public function index(JeuRepository $jeuRepository, AvisRepository $avisRepository): Response
    {
        $mieuxNotes = $jeuRepository->mieuxNotes(6);

        return $this->render('home/index.html.twig', [
            'vedette' => $mieuxNotes[0]['jeu'] ?? null,
            'mieuxNotes' => $mieuxNotes,
            'derniersAvis' => $avisRepository->derniers(6),
            'nbJeux' => $jeuRepository->count([]),
            'nbAvis' => $avisRepository->count([]),
        ]);
    }
}
