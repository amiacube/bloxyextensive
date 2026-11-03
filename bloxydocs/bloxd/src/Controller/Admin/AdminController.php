<?php

namespace App\Controller\Admin;

use App\Repository\AvisRepository;
use App\Repository\GenreRepository;
use App\Repository\JeuRepository;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin')]
class AdminController extends AbstractController
{
    #[Route('', name: 'admin_index')]
    public function index(
        UserRepository $userRepository,
        JeuRepository $jeuRepository,
        GenreRepository $genreRepository,
        AvisRepository $avisRepository,
    ): Response {
        return $this->render('admin/index.html.twig', [
            'nbUsers' => $userRepository->count([]),
            'nbJeux' => $jeuRepository->count([]),
            'nbGenres' => $genreRepository->count([]),
            'nbAvis' => $avisRepository->count([]),
        ]);
    }

    #[Route('/utilisateurs', name: 'admin_user_index')]
    public function users(): Response
    {
        return $this->render('admin/user/index.html.twig');
    }
}
