import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    
    var body: some View {
        NavigationStack {
            if authViewModel.isAuthenticated {
                DashboardView()
            } else {
                AuthView()
            }
        }
        .onAppear {
            // Check for existing credentials
            authViewModel.checkAuthStatus()
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(AuthViewModel())
    }
} 