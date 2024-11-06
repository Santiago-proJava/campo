import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { CartService } from '../../services/cart.service';
import Swal from 'sweetalert2';
import { RecaptchaFormsModule, RecaptchaModule } from 'ng-recaptcha';
declare var initDropdowns: any;  // Si usas una biblioteca externa como Flowbite, declárala

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule, RecaptchaModule, RecaptchaFormsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})

export class NavbarComponent implements OnInit, AfterViewInit {
  isCartOpen = false;
  isAuthModalOpen = false;
  isRegistering = false;
  isLoggedIn = false;
  isDropdownOpen = false;
  errorMessage: string = '';
  login = { correo: '', contrasena: '' };
  register = { nombres: '', apellidos: '', correo: '', contrasena: '', celular: '', rol: 'comprador' };
  usuario: any = null;
  productosCarrito: any[] = [];
  private intentarPagar: boolean = false;
  captchaResponse: string = '';
  siteKey: string = '6LfinXUqAAAAANSNuMjouaodI69lcsIqMUXcB4Jr';

  constructor(private authService: AuthService, private router: Router, private cartService: CartService) { }

  ngOnInit() {
    const usuarioGuardado = localStorage.getItem('usuario');
    if (usuarioGuardado) {
      this.usuario = JSON.parse(usuarioGuardado);
      this.isLoggedIn = true;
    } else {
      this.isLoggedIn = false;
    }
    this.productosCarrito = this.cartService.getItems();
  }

  ngAfterViewInit() {
    if (typeof initDropdowns === 'function') {
      initDropdowns();  // Asegúrate de reemplazar esto con la función que inicializa tus dropdowns
    }
  }

  resolved(captchaResponse: string): void {
    this.captchaResponse = captchaResponse;
  }

  toggleCart() {
    this.isCartOpen = !this.isCartOpen;
  }

  pagar() {
    if (this.productosCarrito.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Carrito vacío',
        text: 'No tienes productos en el carrito. Agrega productos antes de continuar.',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Aceptar'
      });
      return; // Sale de la función si el carrito está vacío
    }

    if (this.isLoggedIn) {
      this.router.navigate(['/pasarela-pago']);  // Cambia '/pago' a la ruta de tu pasarela de pago
    } else {
      this.intentarPagar = true;
      this.toggleAuthModal();
    }
  }

  incrementQuantity(index: number) {
    const producto = this.productosCarrito[index];
    if (producto.cantidad < 10) {  // Establece un máximo si es necesario
      producto.cantidad++;
      this.updateCart();
    }
  }

  decrementQuantity(index: number) {
    const producto = this.productosCarrito[index];
    if (producto.cantidad > 1) {  // No permitir que la cantidad sea menor a 1
      producto.cantidad--;
      this.updateCart();
    }
  }

  removeFromCart(index: number) {
    this.cartService.removeFromCart(index);
    this.productosCarrito = this.cartService.getItems();
  }

  getCartTotal() {
    return this.transform(this.productosCarrito.reduce((total, producto) => total + producto.precio * producto.cantidad, 0));
  }

  updateCart() {
    this.cartService.updateCart(this.productosCarrito);  // Guarda el carrito actualizado en localStorage
  }

  getFotoUrl(foto: string): string {
    return `http://localhost:4000/uploads/${foto}`;
  }

  transform(value: number): string {
    return `$${value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  toggleAuthModal(isRegistering: boolean = false) {
    this.isAuthModalOpen = !this.isAuthModalOpen;
    this.isRegistering = isRegistering;  // Determina si estamos en modo registro o inicio de sesión
    this.errorMessage = ''; // Resetea el mensaje de error cada vez que abres el modal
  }

  toggleRegistering() {
    this.isRegistering = !this.isRegistering;  // Cambia el estado entre registrar e iniciar sesión
    this.errorMessage = ''; // Resetea el mensaje de error al cambiar entre registro e inicio de sesión
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;  // Cambia el estado del dropdown del avatar
  }

  onIniciarSesion() {
    this.authService.iniciarSesion(this.login.correo, this.login.contrasena).subscribe(
      (response) => {
        const token = response.token;
        const usuario = response.user;
        this.authService.guardarToken(token);
        this.authService.guardarUsuarioEnLocalStorage(usuario);
        this.usuario = usuario;
        this.isLoggedIn = true;
        this.isDropdownOpen = false;
        this.toggleAuthModal();

        if (usuario.rol === 'admin') {
          this.router.navigate(['/admin']);
          return;
        }

        // Redirigir a la pasarela de pago si el usuario intentaba pagar
        if (this.intentarPagar) {
          this.router.navigate(['/pasarela-pago']);  // Cambia '/pago' a tu pasarela de pago
          this.intentarPagar = false;  // Restablecer la intención después de redirigir
        } else {
          this.router.navigate(['/']);  // Redirigir a la página principal o donde desees
        }
      },
      (error) => {
        console.error('Error al iniciar sesión', error);
        this.errorMessage = error.error?.msg || 'Error al iniciar sesión';

        // Comprobar si el error es de cuenta no verificada
        if (error.error?.msg === 'Por favor confirma tu cuenta antes de iniciar sesión.') {
          this.errorMessage = 'Por favor confirma tu cuenta. Revisa tu correo electrónico.';
        }
      }
    );
  }

  onRegistrarse() {
    // Verificación de campos vacíos
    if (!this.register.nombres.trim()) {
      this.errorMessage = 'Por favor ingresa tus nombres.';
      return;
    }
    if (!this.register.apellidos.trim()) {
      this.errorMessage = 'Por favor ingresa tus apellidos.';
      return;
    }
    if (!this.register.correo.trim()) {
      this.errorMessage = 'Por favor ingresa tu correo electrónico.';
      return;
    }
    if (!this.register.contrasena.trim()) {
      this.errorMessage = 'Por favor ingresa una contraseña.';
      return;
    }
    if (!this.register.celular.trim()) {
      this.errorMessage = 'Por favor ingresa tu número de celular.';
      return;
    }
    if (!this.register.rol.trim()) {
      this.errorMessage = 'Por favor selecciona un rol.';
      return;
    }

    // Verificar reCAPTCHA
    if (!this.captchaResponse) {
      this.errorMessage = 'Por favor completa el CAPTCHA.';
      return;
    }

    // Limpiar mensajes de error y continuar con el registro
    this.errorMessage = '';
    const registroData = { ...this.register, captchaToken: this.captchaResponse };

    this.authService.registrarUsuario(registroData).subscribe(
      (response) => {
        Swal.fire({
          icon: 'success',
          title: 'Registro Exitoso',
          text: 'Revisa tu correo para confirmar la cuenta en los próximos 5 minutos.',
          confirmButtonColor: '#27ae60'
        });
        this.toggleAuthModal();
        this.router.navigate(['/']);
      },
      (error) => {
        this.errorMessage = error.error?.msg || 'Ocurrió un error al registrar el usuario. Inténtalo de nuevo.';
      }
    );
  }

  cerrarSesion() {
    this.authService.cerrarSesion();
    this.usuario = null;
    this.isLoggedIn = false;
    this.isDropdownOpen = false;
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/']);
  }

  validateKeypress(event: KeyboardEvent) {
    const charCode = event.charCode;

    // Permitir solo dígitos (códigos ASCII de 48 a 57)
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  navigateToCategory(category: string) {
    this.router.navigate(['/mercado'], { queryParams: { categoria: category } });
  }
}
