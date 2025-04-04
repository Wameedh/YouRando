import SwiftUI

struct AuthView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    
    var body: some View {
        VStack(spacing: 40) {
            // Logo and App Name
            VStack(spacing: 20) {
                Image(systemName: "play.tv")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 150, height: 150)
                    .foregroundColor(.white)
                
                Text("YouRando")
                    .font(.system(size: 48, weight: .bold))
                    .foregroundColor(.white)
                
                Text("Discover the unexpected on YouTube")
                    .font(.title2)
                    .foregroundColor(.gray)
            }
            
            // Description
            Text("YouRando helps you break out of your recommendation bubble by suggesting YouTube videos you wouldn't normally see. Sign in with your Google account to get started.")
                .font(.headline)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 100)
            
            // Sign in button
            Button(action: {
                authViewModel.signIn()
            }) {
                HStack {
                    Image(systemName: "person.crop.circle.fill")
                        .imageScale(.large)
                    Text("Sign in with Google")
                        .font(.headline)
                }
                .padding()
                .frame(width: 400)
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
            .buttonStyle(CardButtonStyle())
            .disabled(authViewModel.isLoading)
            
            // Loading indicator
            if authViewModel.isLoading {
                ProgressView()
                    .scaleEffect(2.0)
            }
            
            // Error message
            if let error = authViewModel.error {
                Text(error)
                    .foregroundColor(.red)
                    .padding()
            }
            
            Spacer()
            
            // Footer
            Text("© 2023 YouRando. All rights reserved.")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding(60)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }
}

struct CardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .brightness(configuration.isPressed ? 0.1 : 0)
            .animation(.easeInOut(duration: 0.2), value: configuration.isPressed)
            .focusable(true)
    }
}

struct AuthView_Previews: PreviewProvider {
    static var previews: some View {
        AuthView()
            .environmentObject(AuthViewModel())
    }
} 